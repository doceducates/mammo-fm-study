"""SQLAlchemy ORM models for Mammo-FM Study Database."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from .session import Base


class StudyCase(Base):
    __tablename__ = "study_case"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    anonymized_id = Column(String, unique=True, nullable=False, index=True)
    patient_name = Column(String, nullable=True)  # Anonymized prior to external export
    enrolment_date = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    breast_side = Column(String, nullable=True)
    lesion_side = Column(String, nullable=True)
    lesion_quadrant = Column(String, nullable=True)
    radiological_finding = Column(String, nullable=True)
    breast_density = Column(String, nullable=True)
    lesion_size_mm = Column(Float, nullable=True)
    radiologist_birads = Column(String, nullable=True)
    histopathology = Column(String, nullable=True)
    histopath_type = Column(String, nullable=True)
    examiner = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    inferences = relationship("AIInference", back_populates="study_case", cascade="all, delete-orphan")


class AIInference(Base):
    __tablename__ = "ai_inference"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    case_id = Column(Integer, ForeignKey("study_case.id", ondelete="CASCADE"), nullable=False, index=True)
    model_name = Column(String, nullable=False, default="Mammo-FM")
    model_version = Column(String, nullable=True)
    prob = Column(Float, nullable=False)
    threshold = Column(Float, nullable=False, default=0.5)
    predicted_class = Column(String, nullable=True)
    run_at = Column(DateTime, default=datetime.utcnow)

    study_case = relationship("StudyCase", back_populates="inferences")


class MetricSnapshot(Base):
    __tablename__ = "metric_snapshot"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    model_name = Column(String, nullable=True)
    threshold = Column(Float, nullable=True)
    n_cases = Column(Integer, nullable=True)
    tp = Column(Integer, nullable=True)
    tn = Column(Integer, nullable=True)
    fp = Column(Integer, nullable=True)
    fn = Column(Integer, nullable=True)
    sensitivity = Column(Float, nullable=True)
    specificity = Column(Float, nullable=True)
    ppv = Column(Float, nullable=True)
    npv = Column(Float, nullable=True)
    accuracy = Column(Float, nullable=True)
    auc = Column(Float, nullable=True)
    computed_at = Column(DateTime, default=datetime.utcnow)


class SynopsisVersion(Base):
    __tablename__ = "synopsis_version"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    version_tag = Column(String, nullable=False, default="Draft")
    content = Column(String, nullable=False)
    word_count = Column(Integer, nullable=True)
    author = Column(String, default="Dr. Muhammad Mudassir")
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

