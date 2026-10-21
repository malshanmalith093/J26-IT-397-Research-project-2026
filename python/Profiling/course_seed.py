"""
Starter course content (3 real-world introductory courses).

Inserted into MongoDB (research_db.c2_courses) the first time the app starts
if the collection is empty. Admins can then edit, add or delete courses from
the Courses page. The advice engine uses the lessons as the course context,
and the future course-content chatbot will use the same lesson text.
"""

SEED_COURSES = [
    # ------------------------------------------------------------------ Python
    {
        "code": "IT1010",
        "name": "Introduction to Python Programming",
        "description": "Learn to write simple, correct Python programs: variables, decisions, loops, "
                       "functions, lists and dictionaries, and reading files. No previous programming needed.",
        "level": "Year 1",
        "credits": 3,
        "lecturer": "Course lecturer",
        "total_weeks": 6,
        "current_week": 4,
        "expected_progress": 65,
        "assignments_released": 6,
        "upcoming": ["Lab test 1 (Week 5)", "Mini project: grade calculator (Week 6)"],
        "lessons": [
            {
                "week": 1,
                "title": "Getting started: variables, types and input/output",
                "summary": "Run your first program and store values in variables.",
                "content": "A Python program is a list of instructions that runs from top to bottom. "
                           "A variable is a name that refers to a value, for example age = 20. Every value has a type: "
                           "int for whole numbers, float for decimals, str for text and bool for True/False.\n\n"
                           "print() shows output and input() reads text typed by the user. input() always returns a "
                           "string, so convert it with int() or float() before doing maths.",
                "objectives": ["Run a Python script", "Create variables of different types",
                               "Read user input and convert it to a number"],
                "key_points": ["Variable names are case-sensitive", "input() returns a string",
                               "Use int() / float() to convert text to numbers",
                               "type(x) tells you the type of a value"],
                "example": {"language": "python",
                            "code": "name = input(\"Your name: \")\nmarks = float(input(\"Your mark: \"))\n"
                                    "print(\"Hello\", name, \"- your mark is\", marks)"},
                "practice": ["Write a program that asks for two numbers and prints their sum.",
                             "What is the type of the value returned by input('Age: ')?"],
                "resources": [{"title": "Python tutorial - An informal introduction",
                               "url": "https://docs.python.org/3/tutorial/introduction.html"}],
            },
            {
                "week": 2,
                "title": "Making decisions with if, elif and else",
                "summary": "Let your program choose what to do using conditions.",
                "content": "A condition is an expression that is True or False, such as marks >= 50. "
                           "An if statement runs its indented block only when the condition is True. "
                           "elif checks another condition, and else runs when none of the conditions were True.\n\n"
                           "Combine conditions with and, or and not. Indentation (4 spaces) is part of Python's "
                           "syntax - it shows which lines belong to the if block.",
                "objectives": ["Write comparisons with ==, !=, <, >, <=, >=",
                               "Use if / elif / else correctly", "Combine conditions with and / or"],
                "key_points": ["= assigns, == compares", "Only the first True branch runs",
                               "Indentation defines the block"],
                "example": {"language": "python",
                            "code": "marks = 72\nif marks >= 75:\n    grade = \"A\"\nelif marks >= 65:\n    grade = \"B\"\n"
                                    "elif marks >= 50:\n    grade = \"C\"\nelse:\n    grade = \"F\"\nprint(grade)"},
                "practice": ["Write a program that prints whether a number is positive, negative or zero.",
                             "Why does the order of the elif conditions matter in the grade example?"],
                "resources": [{"title": "Python tutorial - if statements",
                               "url": "https://docs.python.org/3/tutorial/controlflow.html#if-statements"}],
            },
            {
                "week": 3,
                "title": "Repeating work with for and while loops",
                "summary": "Use loops to repeat instructions without copying code.",
                "content": "A for loop repeats once for each item in a sequence, for example for i in range(5) "
                           "runs with i = 0, 1, 2, 3, 4. A while loop repeats as long as its condition stays True, "
                           "so something inside the loop must eventually make the condition False.\n\n"
                           "break leaves a loop early and continue skips to the next round. A common pattern is the "
                           "accumulator: start total = 0 and add to it inside the loop.",
                "objectives": ["Use range() with for loops", "Write a while loop that stops correctly",
                               "Use an accumulator to total values"],
                "key_points": ["range(n) goes from 0 to n-1", "Avoid infinite while loops",
                               "break exits, continue skips"],
                "example": {"language": "python",
                            "code": "total = 0\nfor mark in [55, 78, 64, 90]:\n    total += mark\n"
                                    "print(\"Average:\", total / 4)"},
                "practice": ["Print the multiplication table of 7 using a for loop.",
                             "Write a while loop that keeps asking for a password until the user types 'sliit'."],
                "resources": [{"title": "Python tutorial - for statements and range()",
                               "url": "https://docs.python.org/3/tutorial/controlflow.html#for-statements"}],
            },
            {
                "week": 4,
                "title": "Functions: reusable blocks of code",
                "summary": "Define functions with parameters and return values.",
                "content": "A function groups code under a name so it can be reused: def area(w, h): return w * h. "
                           "Parameters are the inputs; return sends a result back to the caller. A function without "
                           "return gives None.\n\n"
                           "Variables created inside a function are local - they do not exist outside it. Small "
                           "functions that do one job are easier to test and debug.",
                "objectives": ["Define and call functions", "Use parameters and return values",
                               "Explain local vs global variables"],
                "key_points": ["print() shows a value, return gives it back", "Default values: def f(x, y=1)",
                               "One function = one job"],
                "example": {"language": "python",
                            "code": "def grade(marks):\n    if marks >= 50:\n        return \"Pass\"\n    return \"Fail\"\n\n"
                                    "print(grade(67))"},
                "practice": ["Write a function is_even(n) that returns True or False.",
                             "What is the difference between printing a value and returning it?"],
                "resources": [{"title": "Python tutorial - Defining functions",
                               "url": "https://docs.python.org/3/tutorial/controlflow.html#defining-functions"}],
            },
            {
                "week": 5,
                "title": "Lists and dictionaries",
                "summary": "Store many values together and look them up by key.",
                "content": "A list keeps items in order: marks = [55, 78, 64]. Use marks[0] for the first item, "
                           "append() to add, len() to count and a for loop to visit each item.\n\n"
                           "A dictionary stores key-value pairs: student = {\"name\": \"Nimal\", \"gpa\": 3.2}. "
                           "Look up values with student[\"name\"] and loop over items() to get both key and value.",
                "objectives": ["Create, index and update lists", "Create and use dictionaries",
                               "Loop through lists and dictionaries"],
                "key_points": ["Indexes start at 0", "Dictionary keys must be unique",
                               "Use .get(key) to avoid KeyError"],
                "example": {"language": "python",
                            "code": "marks = {\"Python\": 72, \"Web\": 65, \"DB\": 58}\n"
                                    "for module, mark in marks.items():\n    print(module, mark)"},
                "practice": ["Find the highest mark in a list without using max().",
                             "Count how many times each word appears in a sentence using a dictionary."],
                "resources": [{"title": "Python tutorial - Data structures",
                               "url": "https://docs.python.org/3/tutorial/datastructures.html"}],
            },
            {
                "week": 6,
                "title": "Working with files and handling errors",
                "summary": "Read and write text files and handle mistakes safely.",
                "content": "Open files with a with block so they close automatically: with open(\"marks.txt\") as f. "
                           "Use \"r\" to read, \"w\" to overwrite and \"a\" to append.\n\n"
                           "When something goes wrong, Python raises an exception. try / except lets your program "
                           "respond, for example asking again when int() gets text that is not a number.",
                "objectives": ["Read and write text files", "Use try / except for common errors",
                               "Combine files, loops and functions in a small program"],
                "key_points": ["Always use with open(...)", "Catch specific errors like ValueError",
                               "\"w\" mode deletes old content"],
                "example": {"language": "python",
                            "code": "try:\n    age = int(input(\"Age: \"))\nexcept ValueError:\n"
                                    "    print(\"Please enter a number\")"},
                "practice": ["Write the numbers 1-10 to a file, then read the file and print the total.",
                             "Which exception is raised by int('abc')?"],
                "resources": [{"title": "Python tutorial - Errors and exceptions",
                               "url": "https://docs.python.org/3/tutorial/errors.html"}],
            },
        ],
    },
    # ------------------------------------------------------------------ Web
    {
        "code": "IT1050",
        "name": "Web Development Basics",
        "description": "Build simple web pages with HTML, style them with CSS, and add interactivity with "
                       "JavaScript. Ends with a small responsive personal website.",
        "level": "Year 1",
        "credits": 3,
        "lecturer": "Course lecturer",
        "total_weeks": 6,
        "current_week": 4,
        "expected_progress": 65,
        "assignments_released": 6,
        "upcoming": ["Practical: responsive layout (Week 5)", "Personal website submission (Week 6)"],
        "lessons": [
            {
                "week": 1,
                "title": "How the web works and HTML basics",
                "summary": "Understand browsers, servers and the structure of an HTML page.",
                "content": "When you open a website, the browser sends an HTTP request to a server and receives "
                           "HTML, CSS and JavaScript files. HTML describes the content and structure of the page.\n\n"
                           "HTML uses elements written with tags, such as <h1> for a main heading and <p> for a "
                           "paragraph. Every page has <html>, <head> (title, links to CSS) and <body> (visible content).",
                "objectives": ["Explain the request/response cycle", "Write a valid HTML page skeleton",
                               "Use headings, paragraphs, links and images"],
                "key_points": ["HTML = structure, CSS = style, JS = behaviour", "Most tags have an opening and closing tag",
                               "Images need an alt attribute"],
                "example": {"language": "html",
                            "code": "<!DOCTYPE html>\n<html>\n  <head><title>My page</title></head>\n  <body>\n"
                                    "    <h1>Hello!</h1>\n    <p>Welcome to my first page.</p>\n"
                                    "    <a href=\"https://www.sliit.lk\">SLIIT</a>\n  </body>\n</html>"},
                "practice": ["Create a page about yourself with a heading, a photo and two links.",
                             "What is the difference between <head> and <body>?"],
                "resources": [{"title": "MDN - Getting started with HTML",
                               "url": "https://developer.mozilla.org/en-US/docs/Learn/HTML/Introduction_to_HTML/Getting_started"}],
            },
            {
                "week": 2,
                "title": "Lists, tables and forms in HTML",
                "summary": "Organise content and collect user input.",
                "content": "Use <ul> for bullet lists, <ol> for numbered lists and <table> with <tr>, <th> and <td> "
                           "for tabular data such as a timetable.\n\n"
                           "Forms collect input. A <form> contains <label> and <input> elements; the type attribute "
                           "(text, email, password, number) controls what the user can type. Labels make forms "
                           "accessible to screen readers.",
                "objectives": ["Build ordered and unordered lists", "Build a simple table",
                               "Create an accessible form with labels"],
                "key_points": ["Use tables only for data, not layout", "Connect <label for> to the input id",
                               "required makes a field mandatory"],
                "example": {"language": "html",
                            "code": "<form>\n  <label for=\"email\">Email</label>\n"
                                    "  <input id=\"email\" type=\"email\" required>\n  <button>Send</button>\n</form>"},
                "practice": ["Build your weekly timetable as an HTML table.",
                             "Create a registration form with name, email and password fields."],
                "resources": [{"title": "MDN - Web forms",
                               "url": "https://developer.mozilla.org/en-US/docs/Learn/Forms"}],
            },
            {
                "week": 3,
                "title": "Styling pages with CSS",
                "summary": "Change colours, fonts and spacing using selectors and the box model.",
                "content": "CSS rules have a selector and declarations: p { color: navy; }. Select elements by tag, "
                           "by class (.card) or by id (#header). Put CSS in a separate file and link it in <head>.\n\n"
                           "Every element is a box: content, padding, border and margin. Understanding the box model "
                           "is the key to controlling spacing and size.",
                "objectives": ["Write CSS rules with tag, class and id selectors", "Link an external stylesheet",
                               "Explain padding vs margin"],
                "key_points": ["Classes can be reused, ids are unique", "Padding is inside the border, margin outside",
                               "box-sizing: border-box makes sizes easier"],
                "example": {"language": "css",
                            "code": ".card {\n  padding: 16px;\n  margin: 12px;\n  border: 1px solid #ddd;\n"
                                    "  border-radius: 8px;\n}"},
                "practice": ["Style your 'about me' page with a font, colours and a card for each section.",
                             "Draw the box model for a button with padding 10px and margin 5px."],
                "resources": [{"title": "MDN - CSS first steps",
                               "url": "https://developer.mozilla.org/en-US/docs/Learn/CSS/First_steps"}],
            },
            {
                "week": 4,
                "title": "Layouts with Flexbox and responsive design",
                "summary": "Arrange elements in rows and columns that adapt to phone and desktop screens.",
                "content": "Flexbox lays out items in one direction. Set display: flex on the parent, then use "
                           "justify-content (main axis) and align-items (cross axis) to position the children.\n\n"
                           "Responsive design makes one page work on all screen sizes. Add the viewport meta tag and "
                           "use media queries, for example @media (max-width: 600px) { ... }, to change the layout on "
                           "small screens.",
                "objectives": ["Build a navigation bar with Flexbox", "Use media queries",
                               "Test a page on different screen sizes"],
                "key_points": ["display: flex goes on the container", "flex-wrap lets items move to a new line",
                               "Design mobile-first, then add larger-screen rules"],
                "example": {"language": "css",
                            "code": "nav { display: flex; justify-content: space-between; }\n"
                                    "@media (max-width: 600px) {\n  nav { flex-direction: column; }\n}"},
                "practice": ["Make a three-card row that becomes one column on phones.",
                             "Which property centres items vertically in a flex row?"],
                "resources": [{"title": "MDN - Flexbox",
                               "url": "https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Flexbox"}],
            },
            {
                "week": 5,
                "title": "JavaScript basics",
                "summary": "Variables, functions and conditions in the browser's programming language.",
                "content": "JavaScript runs in the browser. Declare variables with let (can change) or const (cannot be "
                           "reassigned). Functions group code, and if / else works like in other languages.\n\n"
                           "Use the browser console (F12) to test code and see errors - console.log() prints values "
                           "there. Strict equality === compares both value and type.",
                "objectives": ["Declare variables with let and const", "Write functions and conditions",
                               "Debug with the browser console"],
                "key_points": ["Prefer const, use let when the value changes", "Use === instead of ==",
                               "Read the console error message first"],
                "example": {"language": "javascript",
                            "code": "function grade(marks) {\n  if (marks >= 50) return 'Pass';\n  return 'Fail';\n}\n"
                                    "console.log(grade(64));"},
                "practice": ["Write a function that converts Celsius to Fahrenheit.",
                             "What does console.log(5 === '5') print and why?"],
                "resources": [{"title": "MDN - JavaScript first steps",
                               "url": "https://developer.mozilla.org/en-US/docs/Learn/JavaScript/First_steps"}],
            },
            {
                "week": 6,
                "title": "The DOM and events",
                "summary": "Change the page with JavaScript when the user clicks or types.",
                "content": "The DOM is the browser's model of the page. document.querySelector('#id') finds an "
                           "element; changing element.textContent or element.classList updates the page instantly.\n\n"
                           "Events let the page react: button.addEventListener('click', handler) runs handler on each "
                           "click. Form validation is a common use - check the input before sending it.",
                "objectives": ["Select and change elements", "Handle click and input events",
                               "Validate a form with JavaScript"],
                "key_points": ["Load scripts at the end of <body> or use defer", "textContent is safer than innerHTML",
                               "event.preventDefault() stops a form submitting"],
                "example": {"language": "javascript",
                            "code": "const btn = document.querySelector('#hello');\n"
                                    "btn.addEventListener('click', () => {\n"
                                    "  document.querySelector('#msg').textContent = 'Hi!';\n});"},
                "practice": ["Add a dark-mode toggle button to your website.",
                             "Show an error message if the email field is empty when the form is submitted."],
                "resources": [{"title": "MDN - Introduction to events",
                               "url": "https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events"}],
            },
        ],
    },
    # ------------------------------------------------------------------ Databases
    {
        "code": "IT2040",
        "name": "Database Systems",
        "description": "Design relational databases and query them with SQL: tables and keys, ER modelling, "
                       "SELECT queries, joins, normalisation and transactions.",
        "level": "Year 2",
        "credits": 4,
        "lecturer": "Course lecturer",
        "total_weeks": 6,
        "current_week": 4,
        "expected_progress": 65,
        "assignments_released": 6,
        "upcoming": ["SQL lab test (Week 5)", "Database design assignment (Week 6)"],
        "lessons": [
            {
                "week": 1,
                "title": "Databases, tables and keys",
                "summary": "Why we use a DBMS and how relational tables are organised.",
                "content": "A database management system (DBMS) stores data safely, lets many users work at the same "
                           "time and answers questions quickly. In a relational database, data is stored in tables "
                           "made of rows (records) and columns (attributes).\n\n"
                           "A primary key uniquely identifies each row, such as student_id. A foreign key is a column "
                           "that refers to the primary key of another table and links the two tables together.",
                "objectives": ["Explain the benefits of a DBMS over files", "Identify primary and foreign keys",
                               "Describe rows, columns and data types"],
                "key_points": ["Primary key: unique and not null", "Foreign key links tables",
                               "Each column has one data type"],
                "example": {"language": "sql",
                            "code": "CREATE TABLE student (\n  student_id  VARCHAR(10) PRIMARY KEY,\n"
                                    "  name        VARCHAR(100) NOT NULL,\n  gpa         DECIMAL(3,2)\n);"},
                "practice": ["Choose a primary key for a Course table and explain your choice.",
                             "Why should a phone number not be used as a primary key?"],
                "resources": [{"title": "PostgreSQL tutorial - Creating a new table",
                               "url": "https://www.postgresql.org/docs/current/tutorial-table.html"}],
            },
            {
                "week": 2,
                "title": "ER modelling",
                "summary": "Design a database by drawing entities, attributes and relationships.",
                "content": "An Entity-Relationship (ER) diagram shows the things we store data about (entities, such "
                           "as Student and Course), their attributes, and how they relate.\n\n"
                           "Relationships have cardinality: one-to-one, one-to-many (a lecturer teaches many courses) "
                           "or many-to-many (students enrol in many courses). A many-to-many relationship becomes a "
                           "separate table, for example Enrolment(student_id, course_code, grade).",
                "objectives": ["Identify entities and attributes from a scenario", "Assign correct cardinalities",
                               "Convert an ER diagram into tables"],
                "key_points": ["Entities become tables", "1:N - put the foreign key on the 'many' side",
                               "M:N - create a linking table"],
                "example": {"language": "sql",
                            "code": "CREATE TABLE enrolment (\n  student_id  VARCHAR(10) REFERENCES student,\n"
                                    "  course_code VARCHAR(10) REFERENCES course,\n  grade       CHAR(2),\n"
                                    "  PRIMARY KEY (student_id, course_code)\n);"},
                "practice": ["Draw an ER diagram for a library (members, books, loans).",
                             "Convert your library ER diagram into tables with keys."],
                "resources": [{"title": "Lucidchart - What is an ER diagram",
                               "url": "https://www.lucidchart.com/pages/er-diagrams"}],
            },
            {
                "week": 3,
                "title": "SQL queries: SELECT, WHERE and ORDER BY",
                "summary": "Ask questions of a single table.",
                "content": "SELECT chooses columns, FROM chooses the table and WHERE filters rows: "
                           "SELECT name, gpa FROM student WHERE gpa >= 3.0. ORDER BY sorts the result and LIMIT "
                           "restricts how many rows you get.\n\n"
                           "Aggregate functions summarise data: COUNT, SUM, AVG, MIN and MAX. GROUP BY calculates "
                           "an aggregate for each group, and HAVING filters the groups.",
                "objectives": ["Write SELECT queries with WHERE and ORDER BY", "Use aggregate functions",
                               "Use GROUP BY and HAVING"],
                "key_points": ["WHERE filters rows, HAVING filters groups", "Text values go in single quotes",
                               "Use LIKE 'A%' for patterns"],
                "example": {"language": "sql",
                            "code": "SELECT course_code, AVG(mark) AS average\nFROM enrolment\n"
                                    "GROUP BY course_code\nHAVING AVG(mark) < 60\nORDER BY average;"},
                "practice": ["List students whose names start with 'K', sorted by GPA.",
                             "Count how many students are enrolled in each course."],
                "resources": [{"title": "SQLBolt - interactive SQL lessons", "url": "https://sqlbolt.com/"}],
            },
            {
                "week": 4,
                "title": "Joining tables",
                "summary": "Combine data from several tables with JOIN.",
                "content": "Data is split across tables, so most real questions need a JOIN. An INNER JOIN returns rows "
                           "that match in both tables, using the foreign key: "
                           "student JOIN enrolment ON student.student_id = enrolment.student_id.\n\n"
                           "A LEFT JOIN keeps every row from the left table even when there is no match (the missing "
                           "columns become NULL) - useful for questions like 'students who are not enrolled in any course'.",
                "objectives": ["Write INNER JOIN queries", "Use LEFT JOIN to find missing matches",
                               "Join three tables"],
                "key_points": ["Always give the ON condition", "Use table aliases (s, e) for short queries",
                               "LEFT JOIN + IS NULL finds 'no match'"],
                "example": {"language": "sql",
                            "code": "SELECT s.name, c.name AS course, e.grade\nFROM student s\n"
                                    "JOIN enrolment e ON e.student_id = s.student_id\n"
                                    "JOIN course c ON c.course_code = e.course_code;"},
                "practice": ["List each course with the number of students enrolled, including courses with none.",
                             "Find students who have not enrolled in any course."],
                "resources": [{"title": "SQLBolt - Multi-table queries with JOINs",
                               "url": "https://sqlbolt.com/lesson/select_queries_with_joins"}],
            },
            {
                "week": 5,
                "title": "Normalisation (1NF, 2NF, 3NF)",
                "summary": "Remove repeated data so updates do not cause errors.",
                "content": "Poorly designed tables repeat data, which causes update, insert and delete anomalies. "
                           "Normalisation splits tables step by step.\n\n"
                           "1NF: every column holds one value and there are no repeating groups. 2NF: 1NF and every "
                           "non-key column depends on the whole primary key. 3NF: 2NF and no non-key column depends on "
                           "another non-key column (no transitive dependency).",
                "objectives": ["Recognise update, insert and delete anomalies", "Identify functional dependencies",
                               "Normalise a table to 3NF"],
                "key_points": ["'The key, the whole key and nothing but the key'",
                               "Partial dependency breaks 2NF", "Transitive dependency breaks 3NF"],
                "example": {"language": "text",
                            "code": "Enrolment(student_id, course_code, student_name, course_name, grade)\n"
                                    "-> Student(student_id, student_name)\n-> Course(course_code, course_name)\n"
                                    "-> Enrolment(student_id, course_code, grade)"},
                "practice": ["Normalise Order(order_id, customer_name, customer_phone, product, qty) to 3NF.",
                             "Give an example of a delete anomaly."],
                "resources": [{"title": "Microsoft - Database normalization basics",
                               "url": "https://learn.microsoft.com/en-us/office/troubleshoot/access/database-normalization-description"}],
            },
            {
                "week": 6,
                "title": "Transactions and ACID",
                "summary": "Keep data correct when many users change it at the same time.",
                "content": "A transaction is a group of SQL statements that must succeed or fail together, such as "
                           "moving money between two accounts. COMMIT saves the changes; ROLLBACK undoes them.\n\n"
                           "ACID describes reliable transactions: Atomicity (all or nothing), Consistency (rules are "
                           "kept), Isolation (concurrent transactions do not interfere) and Durability (committed data "
                           "survives a crash).",
                "objectives": ["Use BEGIN, COMMIT and ROLLBACK", "Explain each ACID property with an example",
                               "Describe problems caused by concurrent updates"],
                "key_points": ["All statements in a transaction succeed or none do",
                               "Locks provide isolation", "Durability is provided by the transaction log"],
                "example": {"language": "sql",
                            "code": "BEGIN;\nUPDATE account SET balance = balance - 1000 WHERE id = 1;\n"
                                    "UPDATE account SET balance = balance + 1000 WHERE id = 2;\nCOMMIT;"},
                "practice": ["What happens if the system crashes between the two UPDATE statements without a transaction?",
                             "Explain the 'lost update' problem with a short example."],
                "resources": [{"title": "PostgreSQL tutorial - Transactions",
                               "url": "https://www.postgresql.org/docs/current/tutorial-transactions.html"}],
            },
        ],
    },
]

DEFAULT_COURSE_CODE = "IT1010"
