"""AI Clinical Assistant Chatbot Engine for Mammography & BI-RADS Interpretation."""

def get_clinical_chat_response(messages, patient_context=None):
    """Generate intelligent clinical assistant responses for radiology & oncology queries."""
    if not messages:
        return "Hello! I am your AI Clinical Assistant. Ask me anything about this patient's mammogram study, BI-RADS assessment, lesion laterality, or clinical oncology management."
        
    last_msg = messages[-1]["content"].lower()
    
    ctx_str = ""
    if patient_context:
        p_name = patient_context.get("patient_name", "Unknown")
        p_id = patient_context.get("anonymized_id", "N/A")
        prob = patient_context.get("mammo_fm_prob", 0.0)
        cls_name = patient_context.get("mammo_fm_class", "Unrated")
        l_side = patient_context.get("lesion_side", "Unspecified")
        v_side = patient_context.get("breast_side", "Unspecified")
        birads = patient_context.get("radiologist_birads", "N/A")
        
        ctx_str = f"Patient {p_name} (ID: {p_id}) | View: {v_side} | AI Score: {prob:.4f} ({cls_name}) | Detected Lesion Side: {l_side} | Radiologist BI-RADS: {birads}. "

    # Rule-based / Knowledge-driven clinical response synthesis
    if any(k in last_msg for k in ["birads", "bi-rads", "category", "score"]):
        return (f"**BI-RADS Clinical Assessment Overview**:\n\n"
                f"{ctx_str}\n"
                f"* **BI-RADS 1 (Negative)**: 0% likelihood of malignancy. Routine screening in 1 year.\n"
                f"* **BI-RADS 2 (Benign)**: Essential benign findings (e.g., calcifying fibroadenoma). 0% malignancy risk.\n"
                f"* **BI-RADS 3 (Probably Benign)**: <2% malignancy risk. Short-interval follow-up (6 months) recommended.\n"
                f"* **BI-RADS 4 (Suspicious)**: 2% to 95% malignancy risk. Biopsy should be considered:\n"
                f"  - *4A (Low suspicion)*: 2–10% risk.\n"
                f"  - *4B (Moderate suspicion)*: 10–50% risk.\n"
                f"  - *4C (High suspicion)*: 50–95% risk.\n"
                f"* **BI-RADS 5 (Highly Suggestive)**: ≥95% malignancy risk. Immediate tissue diagnosis (core needle biopsy) required.")
                
    elif any(k in last_msg for k in ["biopsy", "manage", "next step", "recommend", "action", "do now"]):
        if patient_context and str(patient_context.get("mammo_fm_prob", 0)) != "":
            try:
                score = float(patient_context.get("mammo_fm_prob", 0))
                if score >= 0.5:
                    return (f"**Clinical Recommendations for High-Risk Scan ({score*100:.1f}% AI Risk)**:\n\n"
                            f"1. **Tissue Diagnosis**: Recommend ultrasound-guided core needle biopsy (CNB) or stereotactic biopsy for findings in the **{patient_context.get('lesion_side', 'affected breast')}**.\n"
                            f"2. **Multimodal Correlation**: Perform targeted diagnostic breast ultrasound to evaluate mass characteristics (margins, echogenicity, vascularity).\n"
                            f"3. **Oncology Referral**: Discuss case in multidisciplinary tumor board (MDT) if histopathology confirms Invasive Ductal Carcinoma (IDC) or DCIS.")
                else:
                    return (f"**Clinical Recommendations for Low-Risk Scan ({score*100:.1f}% AI Risk)**:\n\n"
                            f"1. **Routine Follow-up**: The AI model classified this study as **Benign / Normal** with low feature activation.\n"
                            f"2. **Clinical Correlation**: If radiologist palpation or clinical symptoms exist, proceed with diagnostic ultrasound despite negative mammography.\n"
                            f"3. **Screening Interval**: Resume standard annual or biennial screening mammography based on patient age and familial risk guidelines.")
            except Exception:
                pass
        return ("**Standard Clinical Management Workflow**:\n"
                "* For BI-RADS 4/5 findings: Ultrasound-guided or stereotactic core needle biopsy is standard of care.\n"
                "* For BI-RADS 3: 6-month diagnostic follow-up mammography of the affected breast.\n"
                "* For BI-RADS 1/2: Continue routine screening.")
                
    elif any(k in last_msg for k in ["where", "location", "side", "quadrant", "lesion", "find"]):
        return (f"**Lesion Localization Details**:\n\n"
                f"{ctx_str}\n"
                f"* Our AI model evaluates spatial attention maps across 4 standard views (LCC, RCC, L-MLO, R-MLO).\n"
                f"* By comparing craniocaudal (CC) and mediolateral oblique (MLO) projections, lesions can be localized to specific quadrants (UOQ, UIQ, LOQ, LIQ or Subareolar).\n"
                f"* Check the **🔥 Spatial Attention Heatmap** tab in the PACS viewer to see the exact cyan bounding box `(X, Y, W, H)` highlighting the highest activation region!")
                
    elif any(k in last_msg for k in ["how does model work", "mammo-fm", "ai model", "accuracy", "roc", "clip"]):
        return ("**About Mammo-FM Foundation Model**:\n\n"
                "* **Architecture**: Contrastive Language-Image Pretraining (CLIP) with an EfficientNet-B5 image backbone and clinical text encoder trained on hundreds of thousands of multi-view screening mammograms.\n"
                "* **Zero-Shot & Linear Probing**: Capable of zero-shot BI-RADS assessment and high-accuracy linear probing for breast cancer classification.\n"
                "* **Laterality Awareness**: By processing LCC, RCC, L-MLO, and R-MLO projections independently or as multi-view sets, it accurately distinguishes focal abnormalities from normal dense fibroglandular tissue.")
                
    else:
        return (f"**Clinical AI Assistant Response**:\n\n"
                f"Thank you for your question regarding `{last_msg[:40]}...`.\n\n"
                f"{ctx_str}\n"
                f"Based on our clinical protocols and the Mammo-FM deep feature representations, please evaluate the spatial heatmap overlay and clinical BI-RADS assessment. How else can I assist with this case or your research study?")
