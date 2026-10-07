import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from io import BytesIO


def create_graph(student_id):
    # Replace this with your actual data/ML calculation
    x = [1, 2, 3, 4, 5]

    student_data = {
        "STU001": [60, 65, 70, 75, 80],
        "STU002": [80, 78, 85, 88, 92],
        "STU003": [45, 50, 55, 52, 60]
    }

    y = student_data.get(student_id, [0, 0, 0, 0, 0])

    fig, ax = plt.subplots(figsize=(8, 5))

    ax.plot(x, y, marker="o")
    ax.set_title(f"Student Performance - {student_id}")
    ax.set_xlabel("Assessment")
    ax.set_ylabel("Marks")
    ax.set_ylim(0, 100)

    image = BytesIO()
    fig.savefig(image, format="png", bbox_inches="tight")
    image.seek(0)

    plt.close(fig)

    return image