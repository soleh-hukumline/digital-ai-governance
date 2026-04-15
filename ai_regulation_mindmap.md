# AI Regulation Transformation (Structured Flowchart)

Mermaid `mindmap` bawaan menyebarkan node secara radial tanpa arah yang jelas, membuatnya sulit dibaca.
Pendekatan **Flowchart (Kiri ke Kanan)** ini jauh lebih terstruktur (seperti pohon hierarki folder).

```mermaid
graph LR
    %% Konfigurasi Estetika
    classDef root fill:#0F172A,stroke:#none,color:#fff,font-size:16px,font-weight:bold,rx:8,ry:8,padding:16px
    classDef level1 fill:#2563EB,stroke:#none,color:#fff,font-size:14px,font-weight:bold,rx:6,ry:6,padding:12px
    classDef level2 fill:#EFF6FF,stroke:#BFDBFE,color:#1E3A8A,font-size:13px,font-weight:bold,rx:4,ry:4
    classDef leaf fill:#ffffff,stroke:#E2E8F0,color:#334155,font-size:13px,rx:4,ry:4

    %% Root
    Root("AI Regulation<br/>Transformation"):::root

    %% === Cabang 1 ===
    Root --> H1("1. Current Reality"):::level1
    
    H1 --> H1_A("Legal-formal paradigm"):::level2
    H1 --> H1_B("Inadequate for AI"):::level2
    
    H1_B --> H1_B1("Adaptive"):::leaf
    H1_B --> H1_B2("Cross-sectoral"):::leaf
    H1_B --> H1_B3("Varying risks"):::leaf

    %% === Cabang 2 ===
    Root --> H2("2. New Paradigm"):::level1
    
    H2 --> H2_A("Risk-Based &<br/>HR-Oriented"):::level2
    H2_A --> H2_A1("National Level"):::level2
    H2_A1 --> H2_A1_1("Risk classification"):::leaf
    H2_A1 --> H2_A1_2("Transparency & Documentation"):::leaf
    H2_A1 --> H2_A1_3("Human oversight & Auditability"):::leaf
    H2_A1 --> H2_A1_4("Incident reporting"):::leaf
    H2_A1 --> H2_A1_5("Rights protection"):::leaf

    H2_A --> H2_A2("Sectoral Level"):::level2
    H2_A2 --> H2_A2_1("Finance"):::leaf
    H2_A2 --> H2_A2_2("Biometrics & Media"):::leaf
    H2_A2 --> H2_A2_3("Healthcare"):::leaf
    H2_A2 --> H2_A2_4("Education"):::leaf
    H2_A2 --> H2_A2_5("Judiciary"):::leaf

    H2 --> H2_B("Hybrid Governance"):::level2
    H2_B --> H2_B1("Institutional Level"):::level2
    H2_B1 --> H2_B1_1("Authority coordination"):::leaf
    H2_B1 --> H2_B1_2("Law & tech standards"):::leaf
    H2_B1 --> H2_B1_3("Audits & guidelines"):::leaf
    H2_B1 --> H2_B1_4("Oversight mechanisms"):::leaf

    %% === Cabang 3 ===
    Root --> H3("3. Two Layers of Change"):::level1
    
    H3 --> H3_A("Norm Substance"):::level2
    H3_A --> H3_A1("Risk-based"):::leaf
    H3_A --> H3_A2("HR-oriented"):::leaf
    
    H3 --> H3_B("Governance"):::level2
    H3_B --> H3_B1("Collaborative"):::leaf
    H3_B --> H3_B2("Adaptive"):::leaf
    H3_B --> H3_B3("Cross-sectorally executable"):::leaf
```
