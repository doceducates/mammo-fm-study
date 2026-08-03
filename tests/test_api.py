import sys
import os
sys.path.insert(0, os.path.abspath("."))

import pytest
from fastapi.testclient import TestClient
from api import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "Mammo-FM" in data["model_version"]


def test_get_patients_endpoint():
    response = client.get("/api/patients")
    assert response.status_code == 200
    patients = response.json()
    assert isinstance(patients, list)


def test_save_patient_endpoint():
    test_case = {
        "anonymized_id": "TEST-STUDY-999",
        "patient_name": "Test Patient",
        "age": 45,
        "breast_density": "B",
        "radiologist_birads": "4A",
        "histopathology": "Malignant",
        "histopath_type": "Invasive Ductal Carcinoma (IDC)"
    }
    response = client.post("/api/patients", json=test_case)
    assert response.status_code == 200
    assert response.json()["case"]["anonymized_id"] == "TEST-STUDY-999"

    # Clean up test case
    del_resp = client.delete("/api/patients/TEST-STUDY-999")
    assert del_resp.status_code == 200


def test_export_spss_endpoint():
    response = client.get("/api/export/spss")
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8"
    assert b"anonymized_id" in response.content


def test_benchmark_audit_endpoint():
    response = client.get("/api/benchmark")
    assert response.status_code == 200
    data = response.json()
    assert data["sample_size"] == 20000
    assert data["mean_auc"] == 0.8107
    assert len(data["folds"]) == 5


def test_synopsis_endpoints():
    # GET synopsis
    get_res = client.get("/api/synopsis")
    assert get_res.status_code == 200
    assert "content" in get_res.json()

    # Export DOCX
    docx_res = client.get("/api/synopsis/export/docx")
    assert docx_res.status_code == 200
    assert "wordprocessingml" in docx_res.headers["content-type"]

    # Export PDF
    pdf_res = client.get("/api/synopsis/export/pdf")
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"

