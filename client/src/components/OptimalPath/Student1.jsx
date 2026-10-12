import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from "axios";
import { motion } from 'framer-motion';
import { Plus, Users, Calendar, Lock, Unlock, ChevronRight, ChevronLeft, CalendarDays, Bell, MoreHorizontal, Search, Circle } from 'lucide-react';
//import '../css/print.css';
//import Nav from './Nav';
//const URL = "http://localhost:8080/stock";

function S1() {
    const [studentClusters, setStudentClusters] = useState([]);
    const [newstudent, setnewstudent] = useState([]);
    const navigate = useNavigate();
    const location = useLocation();
    const ComponentsRef = useRef();

    const [filteredStudent, setFilteredStudent] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [noResults, setNoResults] = useState(false);

    
const fetchStudentClusters = async () => {
    try {
        const response = await axios.get(
            "http://localhost:3000/StudentClusters"
        );

        console.log("===== STUDENT CLUSTERS =====");
        console.log(response.data);

        if (Array.isArray(response.data)) {
            setStudentClusters(response.data);
        } else {
            setStudentClusters([]);
        }

    } catch (error) {
        console.error("StudentClusters ERROR:", error);
        setStudentClusters([]);
    }
};

const fetchStudentData = async () => {
    try {
        const response = await axios.get(
            "http://localhost:3000/StudentData"
        );

        console.log("RAW DATA FROM FLASK:", response.data);
        console.log("TYPE:", typeof response.data);
        console.log("IS ARRAY BEFORE PARSE:", Array.isArray(response.data));

        let data = response.data;

        // If Flask sends JSON as a string, convert it to an array
        if (typeof data === "string") {
            try {
                data = JSON.parse(data);
            } catch (parseError) {
                console.error("JSON parsing failed:", parseError);
                data = [];
            }
        }

        console.log("DATA AFTER PARSE:", data);
        console.log("IS ARRAY AFTER PARSE:", Array.isArray(data));
        console.log("RECORD COUNT:", Array.isArray(data) ? data.length : 0);

        if (Array.isArray(data)) {
            setnewstudent(data);
            setFilteredStudent(data);
            setNoResults(data.length === 0);

            return data;
        }

        console.error("Final data is not an array:", data);

        setnewstudent([]);
        setFilteredStudent([]);
        setNoResults(true);

        return [];

    } catch (error) {
        console.error("StudentData ERROR:", error);
        console.error("Message:", error.message);
        console.error("Response:", error.response?.data);
        console.error("Status:", error.response?.status);

        setnewstudent([]);
        setFilteredStudent([]);
        setNoResults(true);

        return [];
    }
};

useEffect(() => {
    console.log("S1 page loaded");

    fetchStudentData();
    fetchStudentClusters();
}, []);
    // useEffect(() => {
    //     fetchStudentData();
    //     fetchStudentClusters();
    // }, [location.key]); // Re-fetch when location changes (after updates)

    const deleteHandler = async (_id) => {
        try {
            await axios.delete(`http://localhost:8080/student/delete/${_id}`);
            alert("Deleted successfully!");
            fetchStudentData(); // Refresh data after delete
        } catch (error) {
            console.error("Error deleting data:", error);
            alert("Failed to delete record. Please try again.");
        }
    };

    

    const priorityData = [];

newstudent.forEach((student) => {
    const exists = priorityData.find(
        (item) =>
            item.student_id === student.student_id &&
            item.module_id === student.module_id
    );

    if (!exists) {
        priorityData.push(student);
    }
});


    const containerStyle = {
        //backgroundImage: "url('https://images.pexels.com/photos/2869215/pexels-photo-2869215.jpeg?auto=compress&cs=tinysrgb&h=650&w=940')", // Background image URL
        backgroundColor: "#e6f2ff",
        backgroundSize: "cover",
        backgroundPosition: "center",
        fontFamily: "Arial, sans-serif",
        margin: "0",
        padding: "0",
        minHeight: "100vh",
        paddingTop: "80px", // Add padding to account for Nav bar
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
    };
    const gridContainer = {
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  //gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  //gridTemplateColumns: "1fr 1fr", // 2 columns
  gap: "20px",
  width: "90%",
   margin:"30px",
   fontSize:"12px"

};
const gridContainer1 = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  //gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  //gridTemplateColumns: "1fr 1fr", // 2 columns
  gap: "20px",
  width: "90%",
   margin:"30px"

};
    const containerStyle1 = {
        backgroundColor: "rgba(255, 255, 255, 0.8)", // Semi-transparent background for form
        width: "100%",
        maxWidth: "1200px",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "20px",
        padding: "20px"
    };

    const buttonStyle = {
        padding: '10px 15px',
        backgroundColor: '#4CAF50',
        color: 'black',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 'bold'
    };


    const currentStudentCluster = studentClusters.find(
    (student) => String(student.student_id).trim() === "S0001"
);
console.log("studentClusters:", studentClusters);
console.log("currentStudentCluster:", currentStudentCluster);

const clusterFeedback = {
    0: {
        title: "Focused and Consistent Learning Pattern",
        description:
            "Your learning activity shows relatively high attention and the highest average study time among the identified learning patterns. Your quiz and assignment performance is also steady.",
        suggestion:
            "Continue using your focused study approach. You may benefit from maintaining your regular study time while concentrating additional practice on topics where your quiz performance is lower."
    },

    1: {
        title: "Strong Learning Progress",
        description:
            "Your learning pattern shows the highest average learning trend, quiz performance, and assignment performance among the identified groups. This suggests that your current learning activities are producing steady academic progress.",
        suggestion:
            "Continue with your current learning approach. Focus on maintaining this progress while gradually working on more challenging topics."
    },

    2: {
        title: "Lower engagement and developing progress",
        description:
            "Your current learning pattern shows slightly lower learning trend, quiz performance, study time, and attention compared with the other identified groups. Your assignment performance remains relatively stable.",
        suggestion:
            "Try shorter but more focused study sessions and regularly revisit topics where your quiz performance is lower. Consistent activity can help strengthen your learning progress."
    }
};

const currentClusterNumber = currentStudentCluster
    ? Number(currentStudentCluster.cluster) + 1
    : null;

const currentClusterFeedback = currentClusterNumber
    ? clusterFeedback[currentClusterNumber]
    : null;

    const moduleNames = {
    1: "Database Systems",
    2: "Software Engineering",
    3: "Computer Networks",
    4: "Data Structure and Analysis",
    5: "Human Computer Interaction"
};
//     const tasks = {
//     1: [
//         "ORDB query practices",
//         "Revision Lecture 1 - Lecture 5",
//         "XML query practices",
//         "Review database systems notes",
//         "quiz from lecture 3 - lecture 5"
//     ],

//     2: [
//         "Agile methodology best practices",
//         "software development ethics revision",
//         "lecture 2 - lecture 5 review",
//         "quiz from overall lectures",
//         "Design phase best practices evaluations"
//     ],

//     3: [
//         "BER encoding calculations",
//         "quiz from lecture 1 - lecture 5",
//         "client server architecture review",
//         "DNS configurations in server VM - practices",
//         "Networking configurations revision"
//     ],

//     4: [
//         "Data cleaning and preprocessing methods",
//         "DecisionTree Classifier revision",
//         "supervised and unsupervised learning",
//         "quiz from lecture 5- lecture 8",
//         "Big Data analysis"
//     ],

//     5: [
//         "user centered design",
//         "methods to gather user feedback",
//         "UI/UX - quiz",
//         "Review lecture 1 - lecture 5",
//         "Figma desigh best practices and guidence"
//     ]
// };

const tasks = {
    1: [
        {
            task_id: "M1_T1",
            task: "ORDB query practices"
        },
        {
            task_id: "M1_T2",
            task: "Revision Lecture 1 - Lecture 5"
        },
        {
            task_id: "M1_T3",
            task: "XML query practices"
        },
        {
            task_id: "M1_T4",
            task: "Review database systems notes"
        },
        {
            task_id: "M1_T5",
            task: "quiz from lecture 3 - lecture 5",
            is_assignment: true
        }
    ],

    2: [
        {
            task_id: "M2_T1",
            task: "Agile methodology best practices"
        },
        {
            task_id: "M2_T2",
            task: "software development ethics revision"
        },
        {
            task_id: "M2_T3",
            task: "lecture 2 - lecture 5 review"
        },
        {
            task_id: "M2_T4",
            task: "quiz from overall lectures",
            is_assignment: true
        },
        {
            task_id: "M2_T5",
            task: "Design phase best practices evaluations"
        }
    ],

    3: [
        {
            task_id: "M3_T1",
            task: "BER encoding calculations"
        },
        {
            task_id: "M3_T2",
            task: "quiz from lecture 1 - lecture 5",
            is_assignment: true
        },
        {
            task_id: "M3_T3",
            task: "client server architecture review"
        },
        {
            task_id: "M3_T4",
            task: "DNS configurations in server VM - practices"
        },
        {
            task_id: "M3_T5",
            task: "Networking configurations revision"
        }
    ],

    4: [
        {
            task_id: "M4_T1",
            task: "Data cleaning and preprocessing methods"
        },
        {
            task_id: "M4_T2",
            task: "DecisionTree Classifier revision"
        },
        {
            task_id: "M4_T3",
            task: "supervised and unsupervised learning"
        },
        {
            task_id: "M4_T4",
            task: "quiz from lecture 5- lecture 8",
            is_assignment: true
        },
        {
            task_id: "M4_T5",
            task: "Big Data analysis"
        }
    ],

    5: [
        {
            task_id: "M5_T1",
            task: "user centered design"
        },
        {
            task_id: "M5_T2",
            task: "methods to gather user feedback"
        },
        {
            task_id: "M5_T3",
            task: "UI/UX - quiz"
        },
        {
            task_id: "M5_T4",
            task: "Review lecture 1 - lecture 5",
            is_assignment: true
        },
        {
            task_id: "M5_T5",
            task: "Figma design best practices and guidance"
        }
    ]
};

const taskCountByPriority = {
    1: 3,
    2: 2,
    3: 1,
    4: 1,
    5: 1
};

// const selectRandomTasks = (moduleId, priority) => {
//     const availableTasks = tasks[moduleId] || [];

//     const numberOfTasks = taskCountByPriority[priority] || 1;

//     const shuffled = [...availableTasks].sort(() => Math.random() - 0.5);

//     return shuffled.slice(0, numberOfTasks);
// };

// selectRandomTasks(3, 1)
const selectRandomTasks = (moduleId, priority) => {
    const normalizedModuleId = Number(moduleId);
    const availableTasks = tasks[normalizedModuleId] || [];

    const normalizedPriority = Number(priority);
    const numberOfTasks = taskCountByPriority[normalizedPriority] || 1;

    const shuffled = [...availableTasks].sort(
        () => Math.random() - 0.5
    );

    return shuffled.slice(0, numberOfTasks);
};

// const generateDailyTasks = () => {

//     const studentPriorityData = priorityData
//         .filter((student) => student.student_id === "S0001")
//         .sort((a, b) => a.priority_rank - b.priority_rank);

//     const dailyTasks = [];

//     studentPriorityData.forEach((module) => {

//         const selectedTasks = selectRandomTasks(
//             module.module_id,
//             module.priority_rank
//         );

//         selectedTasks.forEach((task) => {

//             dailyTasks.push({
//                 student_id: module.student_id,
//                 module_id: module.module_id,
//                 priority_rank: module.priority_rank,
//                 task_id: task.task_id,
//                 task: task.task
//             });

//         });

//     });

//     return dailyTasks;
// };

//const dailyTasks = generateDailyTasks();

const generateDailyTasks = () => {
    const studentPriorityData = priorityData
        .filter((student) => student.student_id === "S0001")
        .sort(
            (a, b) =>
                Number(a.priority_rank) - Number(b.priority_rank)
        );

    const dailyTasks = [];

    studentPriorityData.forEach((module) => {
        const selectedTasks = selectRandomTasks(
            module.module_id,
            module.priority_rank
        );

        selectedTasks.forEach((task) => {
            dailyTasks.push({
                student_id: module.student_id,
                module_id: Number(module.module_id),
                priority_rank: Number(module.priority_rank),
                task_id: task.task_id,
                task: task.task,
                is_assignment: task.is_assignment || false
            });
        });
    });

    console.log("Student priority data:", studentPriorityData);
    console.log("Generated daily tasks:", dailyTasks);

    return dailyTasks;
};

const dailyTasks = generateDailyTasks();

console.log("===== DAILY TASK DEBUG =====");
console.log("Daily tasks:", JSON.stringify(dailyTasks, null, 2));

dailyTasks.forEach((item, index) => {
    console.log(`Task ${index + 1}:`, {
        module_id: item.module_id,
        task_id: item.task_id,
        task: item.task
    });
});

const highestPriorityModule = priorityData
    .filter((student) => student.student_id === "S0001")
    .find((student) => student.priority_rank === 1);

    return (
        <div>
       

        <div style={containerStyle}>

            <div
    style={{
        width: "90%",
        maxWidth: "1200px",
        backgroundColor: "white",
        padding: "20px",
        borderRadius: "12px",
        margin: "20px 0",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
    }}
>
    <h2><b>Your Learning Profile</b></h2>

     {currentClusterFeedback ? (
        <>
            <h3>
                {currentClusterFeedback.title}
            </h3>

            <p
                style={{
                    fontSize: "16px",
                    lineHeight: "1.6",
                    color: "#555"
                }}
            >
                {currentClusterFeedback.description}
            </p>

            <div
                style={{
                    marginTop: "15px",
                    padding: "15px",
                    backgroundColor: "#f3f4f6",
                    borderRadius: "10px"
                }}
            >
                {/* <strong>Personalized suggestion</strong>

                <p
                    style={{
                        marginBottom: 0,
                        marginTop: "8px",
                        lineHeight: "1.6",
                        color: "#555"
                    }}
                >
                    {currentClusterFeedback.suggestion}
                </p> */}
            </div>
        </>
    ) : (
        <p>Learning profile is being calculated...</p>
    )}

    {/* <p>
        Student Cluster:{" "}
        {currentStudentCluster
            ? `Cluster ${Number(currentStudentCluster.cluster) + 1}`
            : "Not found"}
    </p> */}

    
</div>

            {highestPriorityModule && (
    <h1>
        Currently your highest priority module is{" "}
        {moduleNames[highestPriorityModule.module_id] ||
            `Module ${highestPriorityModule.module_id}`}
    </h1>
)}
            <div style={gridContainer}>

            {priorityData
                .filter((student) => student.student_id === "S0001")
                .sort((a, b) => a.priority_rank - b.priority_rank)
                .map((Item) => (
                    <div key={`${Item.student_id}-${Item.module_id}`} style={{
            backgroundColor: "white",
            padding: "20px",
            margin: "10px",
            borderRadius: "10px",
             border:Item.priority_rank === 1
        ? "2px solid #c5401e"
        : Item.priority_rank === 2
        ? "2px solid #ff9800"
        : Item.priority_rank === 3
        ? "2px solid #50af9b"
        : Item.priority_rank === 4
        ? "2px solid #1bcc24"
        : Item.priority_rank === 5
        ? "2px solid #73c581"
        : "1px solid #e5e7eb",
        }}>
{/* 
                        <h2>
                            Student ID: {Item.student_id}
                        </h2> */}

                        <h2>
                            Module : {moduleNames[Item.module_id] || `Module ${Item.module_id}`}
                        </h2>

                        {/* <h3>
                            Quiz Score: {Item.quiz_score}
                        </h3>

                        <h3>
                            Assignment Score: {Item.assignment_score}
                        </h3>

                        <h3>
                            Attention Score: {Item.attention_score}
                        </h3> */}

                        <h2>
                            Weakness Score: {Item.weakness_score}
                        </h2>

                        <h2>
                            Priority Rank: {Item.priority_rank}
                        </h2>

                        <hr />

                    </div>
                ))}
                </div>
                <h1>Today's Tasks</h1>
                <div style={gridContainer1}>
    
    <div >

    {dailyTasks.map((item, index) => (
        <div key={index} style={{
        backgroundColor: "white",
        padding: "18px 60px 18px 22px",
        margin: "8px 10px",
        borderRadius: "10px",

        

        position: "relative",

        // Important
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        alignItems: "flex-start",

        minHeight: "130px",
        boxSizing: "border-box"
    }}>

            <h2 >Module: {moduleNames[item.module_id] || `Module ${item.module_id}`}</h2>

             <p className="card-description" style={{
            fontSize: "12px",
            fontWeight: "600",
            border:item.priority_rank === 1
        ? "2px solid #c5401e"
        : item.priority_rank === 2
        ? "2px solid #ff9800"
        : item.priority_rank === 3
        ? "2px solid #50af9b"
        : item.priority_rank === 4
        ? "2px solid #1bcc24"
        : item.priority_rank === 5
        ? "2px solid #73c581"
        : "1px solid #e5e7eb",
            //color: "#666",
            //backgroundColor: "#f3f4f6",
            padding: "4px 9px",
            borderRadius: "12px",
            marginBottom: "10px"
        }}>
                
                Priority: {item.priority_rank}
                
            </p> 

            <p className="card-description" style={{
            display: "inline-block",
            padding: "5px 10px",
            borderRadius: "20px",
            backgroundColor: "#f3f4f6",
            color: "#555",
            fontSize: "16px",
            fontWeight: "600",
            marginBottom: "12px"
        }}>
                {item.task}

                {item.is_assignment && (
    <span
        style={{
            backgroundColor: "#fff0d9",
            color: "#8a4b08",
            padding: "5px 10px",
            borderRadius: "12px",
            fontSize: "13px",
            fontWeight: "bold",
            marginBottom: "10px"
        }}
    >
        Assignment
    </span>
)}
            </p>
            
                                                               
               <div >
             {/* <span className="icon-group" title="Created">
                            <MoreHorizontal size={16} />
                        </span> */}
                    </div>  

                     <button className="card-action-btn" /*onClick={() => navigate(`/Task/${item.task_id}`)}*/ onClick={() => {
    console.log("Clicked task:", item);
    console.log("Task ID:", item.task_id);

    if (!item.task_id) {
        console.error("Missing task ID", item);
        return;
    }

    navigate(`/task/${item.task_id}`);
}}
                     style={{
        position: "absolute",
        right: "20px",
        top: "50%",
        transform: "translateY(-50%)",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        padding: "8px",
    }} >
                                                                    <ChevronRight size={18} />
                                                                </button>                                                    
        </div>

        
    ))}
    </div>
</div>

        </div>

 <style jsx>{`
    .card-description {
    font-size: 18px;
    color: #4a4a4a;
    line-height: 1.5;
    margin: 0;
    flex: 1; /* lets it fill remaining space */
    overflow: hidden; /* prevents overflowing text */
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3; /* show max 3 lines */
    -webkit-box-orient: vertical;
}

           .icon-group {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .card-footer {
                    padding: 16px 20px;
                    border-top: 1px solid #f0f0f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    
                }

                .footer-icons {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    color: #888;
                }
 `}</style>

        
    </div>
    
    )
}

export default S1