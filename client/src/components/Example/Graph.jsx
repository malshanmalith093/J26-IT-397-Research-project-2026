import { useState } from "react";
import axios from "axios";

function StudentGraph() {
    const [studentId, setStudentId] = useState("STU001");
    const [graphUrl, setGraphUrl] = useState("");

    const generateGraph = async () => {
        try {
            const response = await axios.post(
                "http://localhost:3000/graph",
                {
                    studentId: studentId
                },
                {
                    responseType: "blob"
                }
            );

            // Remove the previous object URL before creating a new one
            if (graphUrl) {
                URL.revokeObjectURL(graphUrl);
            }

            const url = URL.createObjectURL(response.data);

            setGraphUrl(url);

        } catch (error) {
            console.error(
                "Graph generation failed:",
                error.response || error.message
            );
        }
    };

    return (
        <div>
            <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
            <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
            >
                <option value="STU001">Student 1</option>
                <option value="STU002">Student 2</option>
                <option value="STU003">Student 3</option>
            </select>

            <button onClick={generateGraph}>
                Generate Graph
            </button>
            </div>
            {graphUrl && (
                <div>
                    <img
                        src={graphUrl}
                        alt={`Performance graph for ${studentId}`}
                        style={{
                            width: "700px",
                            maxWidth: "100%",
                            marginTop: "20px"
                        }}
                    />
                </div>
            )}
        </div>
    );
}

export default StudentGraph;
