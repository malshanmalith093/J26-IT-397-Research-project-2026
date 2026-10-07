import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from "axios";



function Student() {
    const [newstudent, setnewstudent] = useState([]);
    const navigate = useNavigate();
    const location = useLocation();

    const [filteredStudent, setFilteredStudent] = useState([]);
    const [noResults, setNoResults] = useState(false);

    
    
     useEffect(() => {
        fetchStudentData();
    }, []);

    const fetchStudentData = async () => {
        try {
            const response = await axios.get(
                'http://localhost:3000/Example/new'
            );

            console.log('MongoDB data:', response.data);

            if (Array.isArray(response.data) && response.data.length > 0) {
                setnewstudent(response.data);
                setFilteredStudent(response.data);
                setNoResults(false);
            } else {
                setnewstudent([]);
                setFilteredStudent([]);
                setNoResults(true);
            }

        } catch (error) {
            console.error(
                'Error fetching student data:',
                error.response || error.message
            );

            setnewstudent([]);
            setFilteredStudent([]);
            setNoResults(true);
        }
    };


    return (
        <div>
            
            {noResults ? (
                <div >
                    <p>No Data Found</p>
                </div>
            ) : (
                <div  >
                    {newstudent.map((Item, index) => (
    <div
        key={index}
        style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '15px'
        }}
    >
        <p>
            <strong>Name:</strong> {Item.name}
        </p>

        <p>
            <strong>Email:</strong> {Item.email}
        </p>

    </div>
))}

                    </div>
            )}
                  
                    
                   
            
        </div>
    )
}

export default Student