import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

function Task() {

    const { taskId } = useParams();
    const navigate = useNavigate();

    const [questions, setQuestions] = useState([]);
    const [result, setResult] = useState(null);
const [submitting, setSubmitting] = useState(false);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {

        const fetchQuestions = async () => {

            try {

                setLoading(true);
                setError("");

                console.log("Loading questions for:", taskId);

                const response = await axios.get(
                    `http://localhost:3000/task/${taskId}`
                );

                console.log("Questions received:", response.data);

                if (Array.isArray(response.data)) {
                    setQuestions(response.data);
                } else {
                    setQuestions([]);
                }

            } catch (error) {

                console.error("Error loading questions:", error);

                setError(
                    "Unable to load questions for this task."
                );

                setQuestions([]);

            } finally {

                setLoading(false);

            }
        };

        fetchQuestions();

    }, [taskId]);


    const handleAnswerChange = (questionId, answer) => {

        setAnswers((previousAnswers) => ({
            ...previousAnswers,
            [questionId]: answer
        }));

    };




const handleSubmit = async () => {
    if (submitting || result) return;

    try {
        setSubmitting(true);
        setError("");

        const moduleId = taskId.split("_")[0].replace("M", "");
        
        const quizPayload = {
            student_id: "S0001",
            session_id: "S0001_S1",
            module_id: String(moduleId),
            task_id: taskId,
            answers: answers
        };

        console.log("QUIZ SUBMISSION PAYLOAD:", quizPayload);

        const response = await axios.post(
            "http://localhost:3000/submit-quiz",
            quizPayload
        );

        console.log("QUIZ SUBMISSION RESPONSE:", response.data);

        const quizResult = response.data;

        if (!quizResult.success) {
            setError(
                quizResult.error || "Unable to calculate marks."
            );
            return;
        }

        const quizPercentage = Number(quizResult.percentage);

        if (
            quizResult.percentage === undefined ||
            quizResult.percentage === null ||
            !Number.isFinite(quizPercentage) ||
            quizPercentage < 0 ||
            quizPercentage > 100
        ) {
            setError("A valid quiz percentage was not returned.");
            return;
        }

        // Step 2: Create a quiz session using the calculated percentage.
        const sessionPayload = {
            student_id: "S0001",
            module_id: String(moduleId),
            task_id: taskId,
            task_name: taskId,
            task_type: "quiz",
            quiz_percentage: Number(quizPercentage),
            attempts_taken: 1
        };

        console.log("QUIZ SESSION PAYLOAD:", sessionPayload);

        const sessionResponse = await axios.post(
            "http://localhost:3000/create-session",
            sessionPayload
        );

        console.log("CREATE SESSION RESPONSE:", sessionResponse.data);

        if (!sessionResponse.data.success) {
            setError(
                sessionResponse.data.message ||
                "Quiz calculated, but saving the session failed."
            );
            return;
        }

        setResult(quizResult);

    } catch (err) {
        console.error("QUIZ/SESSION ERROR:", err);
        console.error("SERVER RESPONSE:", err.response?.data);

        setError(
            err.response?.data?.error ||
            err.response?.data?.message ||
            "Quiz submission or session creation failed."
        );
    } finally {
        setSubmitting(false);
    }
};




    if (loading) {

        return (
            <div style={{
                padding: "50px",
                textAlign: "center"
            }}>
                <h2>Loading questions...</h2>
            </div>
        );

    }


    if (error) {

        return (
            <div style={{
                padding: "50px",
                textAlign: "center"
            }}>

                <h2>{error}</h2>

                <button
                    onClick={() => navigate("/S1")}
                >
                    Back to Tasks
                </button>

            </div>
        );

    }
    const gridContainer1 = {
  display: "grid",
  gridTemplateColumns: "repeat(1, 1fr)",
  //gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  //gridTemplateColumns: "1fr 1fr", // 2 columns
  gap: "20px",
  width: "90%",
   margin:"30px"

};

    const buttonStyle = {
        padding: '10px 15px',
        backgroundColor: '#679ad4',
        color: 'black',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 'bold',
        
    };



    return (

        <div style={{
            minHeight: "100vh",
            backgroundColor: "#e6f2ff",
            padding: "100px 30px 40px"
        }}>

            <div style={{
                maxWidth: "900px",
                margin: "0 auto",
                backgroundColor: "white",
                padding: "30px",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
            }}>

                


                <h1>
                    Complete below questions related your tasks.
                </h1>

                 {/* <p>
                    Task id: <strong>{taskId}</strong>
                </p>  */}


                <hr />
                <br></br>
                


                
                <div style={gridContainer1}>
               {questions.length === 0 ? (
  <p>No questions found for this task.</p>
) : (
  questions.map((question, index) => (
    <div key={question.question_id || index}>
      <h3>Question {index + 1}:</h3>

      <p style={{textAlign:"left"}}>
        {question.question || "Question text is missing from the API response."}
      </p>

      <br></br>

      {question.type === "text" || !question.options?.length ? (
        <input
          type="text"
          style={{
display: "block",
marginBottom: "12px",
padding: "10px 12px",
cursor: "pointer",
border: "1px solid #ddd",
borderRadius: "6px",
textAlign:"left",
width:"100%"
}}
          placeholder="Enter your answer"
          value={answers[question.question_id] || ""}
          onChange={(e) =>
            handleAnswerChange(question.question_id, e.target.value)
          }
        />
      ) : (
        question.options.map((option, optionIndex) => (
          <label key={optionIndex}
           style={{
display: "block",
marginBottom: "12px",
padding: "10px 12px",
cursor: "pointer",
border: "1px solid #ddd",
borderRadius: "6px",
textAlign:"left",
backgroundColor:
answers[question.question_id] === option
? "#e6f2ff"
: "#ffffff"
}}>
           
            <input
              type="radio"
              name={question.question_id}
              value={option}
              checked={answers[question.question_id] === option}
              onChange={() =>
                handleAnswerChange(question.question_id, option)
              }
              
            />
            {option}
          </label>
        
        ))
      )}
    </div>
  ))
)}

</div>
                {/* {questions.length > 0 && (

                    <button
                        onClick={handleSubmit}
                        style={{
                            padding: "12px 25px",
                            backgroundColor: "#4CAF50",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "16px",
                            fontWeight: "bold"
                        }}
                    >
                        Submit Answers
                    </button>

                )} */}

                <button onClick={handleSubmit} disabled={submitting} style={buttonStyle}>
  {submitting ? "Calculating Marks..." : "Submit Answers"}
</button>
<br></br>

{error && (
  <p style={{ color: "red" }}>{error}</p>
)}

<br></br>
{result && (
  <div className="quiz-result">
    <hr />
    <br></br>
    <h1>Quiz Results</h1>

    <h3 style={{
            padding: "12px 14px",
            borderRadius: "8px",
            backgroundColor: "#fff",
            border: "1px solid #cfd8dc",
            color: "#c92323",
            fontWeight: "600",
            overflowWrap: "anywhere",
          }}>
      Marks Obtained: {result.obtained_marks} / {result.total_marks}
    </h3>

    <h3>Percentage: {result.percentage}%</h3>

    <div style={gridContainer1}>
    {result.answers.map((answer, index) => (
      <div
        key={answer.question_id || index}
        style={{
          padding: "12px",
          marginBottom: "10px",
          border: "1px solid #141313",
          borderRadius: "8px",
          fontSize:"18px",
          
        }}
      >
        <h4  style={{
            margin: 0,
            fontSize: "19px",
            fontWeight: "700",
            color: "#222",
          }}>
          Question {index + 1}:{" "}
          {answer.is_correct ? "Correct" : "Incorrect"}
        </h4>
        <br></br>
        <p style={{
            margin: "0 0 6px",
            color: "#504f4f",
            fontSize: "18px",
            fontWeight: "700",
          }}>
          <strong>Your answer:</strong>{" "}
          {answer.student_answer || "Not answered"}
        </p>

        <p  style={{
            padding: "12px 14px",
            borderRadius: "8px",
            backgroundColor: "#fff",
            border: "1px solid #cfd8dc",
            color: "#22945f",
            fontWeight: "600",
            overflowWrap: "anywhere",
          }}>
          <strong>Correct answer:</strong>{" "}
          {answer.correct_answer}
        </p>

        <p>
          <strong>Marks:</strong>{" "}
          {answer.marks_awarded} / {answer.total_question_marks}
        </p>
      </div>
    ))}
    </div>
  </div>
)}

            </div>

        </div>

    );
}

export default Task;