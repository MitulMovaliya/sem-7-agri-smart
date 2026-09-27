import React, { useState, useEffect } from "react";

interface RecommendedCrop {
  crop: string;
  score: number;
  reason: string;
}

interface SoilMatch {
  soil_type: string;
  confidence: number;
}

interface SoilPredictionResponse {
  success: boolean;
  predicted_soil_type: string;
  confidence: number;
  top_matches: SoilMatch[];
  recommended_crops: RecommendedCrop[];
}

interface Farm {
  id: string;
  name: string;
  district?: string | null;
}

export default function SoilCNNPredictor() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SoilPredictionResponse | null>(null);

  // Farms
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState("");

  useEffect(() => {
    fetchFarms();
  }, []);

  const fetchFarms = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/farms", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFarms(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn("Failed to fetch user farms.", err);
    }
  };

  const handleFileChange = (file: File | null) => {
    setError(null);
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file (JPEG, PNG, WEBP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit. Please upload a smaller image.");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Please select or drop a soil image before scanning.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("image", selectedFile);
    if (selectedFarmId) {
      formData.append("farmId", selectedFarmId);
    }

    try {
      const res = await fetch("/api/predictions/soil-image", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson.error ||
            errJson.detail ||
            "Soil image classification failed.",
        );
      }

      const data: SoilPredictionResponse = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Error processing soil image classification.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: "var(--primary)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "28px" }}
            >
              center_focus_strong
            </span>
            CNN Soil Image Classification & Crop Suitability
          </h1>
          <p
            style={{
              fontSize: "13px",
              color: "var(--text-secondary)",
              marginTop: "4px",
            }}
          >
            Deep Learning EfficientNet Engine for Visual Soil Recognition &
            Agronomic Crop Selection
          </p>
        </div>

        <div
          style={{
            padding: "8px 16px",
            backgroundColor: "var(--positive-bg)",
            color: "var(--positive)",
            borderRadius: "var(--radius)",
            fontSize: "13px",
            fontWeight: "600",
            border: "1px solid var(--positive)",
          }}
        >
          EfficientNet Transfer Learning Model
        </div>
      </div>

      {/* Main Upload Form Card */}
      <div
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "24px",
          marginBottom: "32px",
        }}
      >
        <form onSubmit={handleSubmit}>
          {/* Farm Link (Optional) */}
          {farms.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                }}
              >
                Link Analysis to Farm (Optional)
              </label>
              <select
                value={selectedFarmId}
                onChange={(e) => setSelectedFarmId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  marginTop: "4px",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--surface)",
                }}
              >
                <option value="">No farm association</option>
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            style={{
              border: dragActive
                ? "2px dashed var(--primary)"
                : "2px dashed var(--border)",
              backgroundColor: dragActive
                ? "var(--surface-tonal)"
                : "var(--background)",
              borderRadius: "var(--radius)",
              padding: "32px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
              marginBottom: "20px",
            }}
            onClick={() => document.getElementById("soil-image-input")?.click()}
          >
            <input
              id="soil-image-input"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            />

            {previewUrl ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <img
                  src={previewUrl}
                  alt="Soil preview"
                  style={{
                    maxHeight: "240px",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                    objectFit: "cover",
                  }}
                />
                <span
                  style={{ fontSize: "12px", color: "var(--text-secondary)" }}
                >
                  Selected File: <strong>{selectedFile?.name}</strong> (
                  {(selectedFile!.size / (1024 * 1024)).toFixed(2)} MB)
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    color: "var(--primary)",
                    textDecoration: "underline",
                  }}
                >
                  Click or drag to replace image
                </span>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "48px", color: "var(--primary)" }}
                >
                  add_a_photo
                </span>
                <p
                  style={{
                    fontSize: "15px",
                    fontWeight: "bold",
                    color: "var(--text-primary)",
                  }}
                >
                  Drag & drop soil photograph here, or click to browse
                </p>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  Supports JPEG, PNG, WEBP up to 10MB
                </p>
              </div>
            )}
          </div>

          {error && (
            <div
              style={{
                padding: "12px 16px",
                backgroundColor: "var(--negative-bg)",
                color: "var(--negative)",
                borderRadius: "var(--radius)",
                marginBottom: "20px",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !selectedFile}
            style={{
              width: "100%",
              padding: "14px",
              backgroundColor: selectedFile
                ? "var(--primary)"
                : "var(--secondary)",
              color: "#ffffff",
              border: "none",
              borderRadius: "var(--radius)",
              fontWeight: "bold",
              fontSize: "15px",
              cursor: loading || !selectedFile ? "not-allowed" : "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {loading ? (
              <>Analyzing Soil Texture & Deep Learning Classification...</>
            ) : (
              <>
                <span className="material-symbols-outlined">analytics</span>
                Classify Soil & Predict Crop Suitability
              </>
            )}
          </button>
        </form>
      </div>

      {/* Results Section */}
      {result && (
        <div>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              marginBottom: "16px",
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ color: "var(--positive)" }}
            >
              verified
            </span>
            Soil Classification & Recommended Crops
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
              gap: "24px",
              marginBottom: "24px",
            }}
          >
            {/* Primary Classification Result Banner */}
            <div
              style={{
                backgroundColor: "var(--primary)",
                color: "#ffffff",
                borderRadius: "var(--radius)",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    opacity: 0.8,
                  }}
                >
                  Visual CNN Identified Soil Type
                </span>
                <h3
                  style={{
                    fontSize: "28px",
                    fontWeight: "bold",
                    marginTop: "6px",
                    color: "#ffffff",
                  }}
                >
                  {result.predicted_soil_type}
                </h3>
              </div>

              <div
                style={{
                  marginTop: "20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <span style={{ fontSize: "13px", opacity: 0.85 }}>
                  Confidence Score:
                </span>
                <span style={{ fontSize: "32px", fontWeight: "bold" }}>
                  {result.confidence}%
                </span>
              </div>
            </div>

            {/* Top Matches Distribution */}
            <div
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "20px",
              }}
            >
              <h4
                style={{
                  fontSize: "14px",
                  fontWeight: "bold",
                  marginBottom: "14px",
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                }}
              >
                Soil Match Confidence Distribution
              </h4>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                {result.top_matches.map((match, idx) => (
                  <div key={idx}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "13px",
                        marginBottom: "4px",
                      }}
                    >
                      <span style={{ fontWeight: "600" }}>
                        {match.soil_type}
                      </span>
                      <span
                        style={{ fontWeight: "bold", color: "var(--primary)" }}
                      >
                        {match.confidence}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: "8px",
                        width: "100%",
                        backgroundColor: "var(--surface-tonal)",
                        borderRadius: "4px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${match.confidence}%`,
                          backgroundColor:
                            idx === 0
                              ? "var(--positive)"
                              : "var(--primary-light)",
                          borderRadius: "4px",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recommended Crops Cards */}
          <div
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "20px",
            }}
          >
            <h3
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                color: "var(--primary)",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span className="material-symbols-outlined">eco</span>
              Agronomic Crop Suitability for {result.predicted_soil_type}
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "16px",
              }}
            >
              {result.recommended_crops.map((item, idx) => {
                const scorePercent = Math.round(item.score * 100);
                return (
                  <div
                    key={idx}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      padding: "16px",
                      backgroundColor: "var(--surface-tonal)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "8px",
                      }}
                    >
                      <h4
                        style={{
                          fontSize: "16px",
                          fontWeight: "bold",
                          color: "var(--text-primary)",
                        }}
                      >
                        {item.crop}
                      </h4>
                      <span
                        style={{
                          padding: "4px 8px",
                          backgroundColor: "var(--positive-bg)",
                          color: "var(--positive)",
                          borderRadius: "var(--radius)",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        {scorePercent}% Suitable
                      </span>
                    </div>

                    <div
                      style={{
                        height: "6px",
                        width: "100%",
                        backgroundColor: "var(--border)",
                        borderRadius: "3px",
                        marginBottom: "12px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${scorePercent}%`,
                          backgroundColor: "var(--positive)",
                          borderRadius: "3px",
                        }}
                      />
                    </div>

                    <p
                      style={{
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                        lineHeight: "1.5",
                      }}
                    >
                      {item.reason}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
