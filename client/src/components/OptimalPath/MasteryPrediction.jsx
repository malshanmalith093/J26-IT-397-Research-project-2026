import React, { useState } from "react";
import axios from "axios";

function MasteryPrediction({ studentId, moduleId }) {

    const [prediction, setPrediction] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const getPrediction = async () => {

        setLoading(true);
        setError("");
        setPrediction(null);

        try {

            const response = await axios.get(
                `http://localhost:3000/students/${studentId}/mastery-prediction/${moduleId}`
            );

            setPrediction(response.data.prediction);

        } catch (err) {

            setError(
                err.response?.data?.error ||
                "Unable to get prediction."
            );

        } finally {
            setLoading(false);
        }
    };
    const isTargetLikely =
        prediction?.predicted_target_reached === 1;

    const feedbackStyle = {
        marginTop: "12px",
        padding: "15px",
        borderRadius: "10px",
        backgroundColor: isTargetLikely ? "#dcfce7" : "#fee2e2",
        border: isTargetLikely
            ? "1px solid #16a34a"
            : "1px solid #dc2626",
        color: isTargetLikely ? "#166534" : "#991b1b"
    };

    return (
        <div className="mastery-prediction">

            <h3>
                Check whether your future targets
                are achievable in this module
            </h3>

            <button
                onClick={getPrediction}
                disabled={loading}
                style={{
                    padding: "9px 15px",
                    border: "none",
                    borderRadius: "6px",
                    backgroundColor: "#2563eb",
                    color: "white",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.6 : 1
                }}
            >
                {loading
                    ? "Predicting..."
                    : "Explain my future outcomes"}
            </button>

            {error && (
                <div style={{
                    marginTop: "12px",
                    padding: "12px",
                    backgroundColor: "#fee2e2",
                    color: "#991b1b",
                    borderRadius: "8px"
                }}>
                    {error}
                </div>
            )}

            {prediction && (
                <div style={{
                    marginTop: "15px",
                    padding: "15px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "10px"
                }}>

                    <p>
                        <strong>Latest score:</strong>{" "}
                        {Number(prediction.current_score).toFixed(2)}%
                    </p>

                    <p>
                        <strong>Target:</strong>{" "}
                        {prediction.target_threshold}%
                    </p>

                    <p>
                        <strong>Prediction:</strong>{" "}
                        {isTargetLikely
                            ? "Likely to reach target"
                            : "Unlikely to reach target"}
                    </p>

                    <p>
                        <strong>Probability:</strong>{" "}
                        {(
                            prediction.probability_target_reached * 100
                        ).toFixed(2)}%
                    </p>

                    {/* Colored model feedback */}
                    <div style={feedbackStyle}>
                        <strong>
                            {isTargetLikely
                                ? "Positive Learning Outcome"
                                : "Additional Practice Recommended"}
                        </strong>

                        <p style={{ marginBottom: 0 }}>
                            {prediction.feedback}
                        </p>
                    </div>

                </div>
            )}

        </div>
    );

    // return (
    //     <div className="mastery-prediction">

    //         <h3>Check your future targets can be achievable with the module</h3>
    //         <br></br>

    //         <button
    //             onClick={getPrediction}
    //             disabled={loading}
    //         >
    //             {loading
    //                 ? "Predicting..."
    //                 : "Explain my future outcomes"}
    //         </button>

    //         {error && <p>{error}</p>}

    //         {prediction && (
    //             <div>

    //                 <p>
    //                     Latest score:{" "}
    //                     {prediction.current_score.toFixed(2)}%
    //                 </p>

    //                 <p>
    //                     Target: achieve {prediction.target_threshold}%
    //                 </p>

    //                 <p>
    //                     Prediction:{" "}
    //                     {prediction.predicted_target_reached === 1
    //                         ? "Likely to reach target"
    //                         : "Unlikely to reach target"}
    //                 </p>

    //                 <p>
    //                     Probability:{" "}
    //                     {(
    //                         prediction.probability_target_reached * 100
    //                     ).toFixed(2)}%
    //                 </p>

    //                 <p >{prediction.feedback}</p>

    //             </div>
    //         )}

    //     </div>
    // );
}

export default MasteryPrediction;