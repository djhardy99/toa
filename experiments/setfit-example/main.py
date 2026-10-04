"""Train a SetFit jailbreak classifier on MiniLM, export it to ONNX, evaluate on train, val and test."""

import json
import os
from pathlib import Path

os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"  # Turns off HF Telemetry

import matplotlib.pyplot as plt
import onnxruntime as ort
from datasets import Dataset
from setfit import SetFitModel, Trainer, TrainingArguments
from setfit.exporters.onnx import export_onnx
from sklearn.metrics import (
    PrecisionRecallDisplay,
    RocCurveDisplay,
    classification_report,
    roc_auc_score,
)

OUT = "target/jailbreak_v1.onnx"


def load(prefix):
    rows = []
    for name, label in (("benign", 0), ("jailbreak", 1)):
        with open(f"data/{prefix}{name}.txt") as f:
            rows += [
                {"text": line.strip(), "label": label} for line in f if line.strip()
            ]
    return rows


splits = {"train": load("train_"), "val": load("val_"), "test": load("test_")}

model = SetFitModel.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
# setfit's ONNX export only keeps modules 0 (transformer) and 1 (pooling), so MiniLM's
# Normalize layer (2) is silently dropped and the head would see different embeddings
del model.model_body._modules["2"]
Trainer(
    model=model,
    args=TrainingArguments(
        batch_size=8,
        num_epochs=1,
        eval_strategy="epoch",
        save_strategy="no",
        output_dir="target/checkpoints",
    ),
    train_dataset=Dataset.from_list(splits["train"]),
    eval_dataset=Dataset.from_list(splits["val"]),
).train()

# opset 14: new enough for the transformer body, still supported by the sklearn head
export_onnx(model.model_body, model.model_head, opset=14, output_path=OUT)
session = ort.InferenceSession(OUT)

pr_fig, pr_ax = plt.subplots()
roc_fig, roc_ax = plt.subplots()
metrics = {}
for name, rows in splits.items():
    texts, labels = [r["text"] for r in rows], [r["label"] for r in rows]
    tok = model.model_body.tokenizer(
        texts, padding=True, truncation=True, return_tensors="np"
    )
    pred, proba = session.run(
        None, {k: tok[k] for k in ("input_ids", "attention_mask", "token_type_ids")}
    )
    assert (
        pred.tolist() == model.predict(texts).tolist()
    ), "ONNX and torch predictions differ"

    print(f"=== {name} ===")
    print(
        classification_report(
            labels, pred, target_names=["benign", "jailbreak"], digits=3
        )
    )
    auc = roc_auc_score(labels, proba[:, 1])
    print(f"auc: {auc:.3f}")
    missed = [(t, y) for t, y, p in zip(texts, labels, pred) if y != p]
    for t, y in missed:
        print(f"missed {'jailbreak' if y else 'benign (false positive)'}: {t}")
    metrics[name] = classification_report(
        labels, pred, target_names=["benign", "jailbreak"], output_dict=True
    ) | {"auc": auc, "missed": [{"text": t, "label": y} for t, y in missed]}
    PrecisionRecallDisplay.from_predictions(labels, proba[:, 1], name=name, ax=pr_ax)
    RocCurveDisplay.from_predictions(labels, proba[:, 1], name=name, ax=roc_ax)

Path("report").mkdir(exist_ok=True)
pr_fig.savefig("report/pr_curve.png", dpi=150)
roc_fig.savefig("report/roc_curve.png", dpi=150)
Path("report/metrics.json").write_text(json.dumps(metrics, indent=2))
