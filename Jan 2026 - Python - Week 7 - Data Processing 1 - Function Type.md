---
Title: Data Processing 1 - Function Type
Course: Jan 2026 - Python
Breadcrumb: Week 7
---

# Data Processing 1 - Function Type

> **Course:** Jan 2026 - Python

Data Processing 1 - Function Type

Submission deadline has passed for this assignment

Due Apr 01, 2026 at 11:59 PM IST

Instructions

Use "Test Run" to verify your code with public test cases.

Press "Submit" to have your assignment evaluated.

You can submit your assignment multiple times up until the deadline.

Make sure to submit your final code by the deadline to receive your score.

Summary

100 out of100

Score

Public Tests

3/3 Passed

Submitted on Apr 01, 2026 at 3:51 AM IST

Private Tests

1/1 Passed

Submitted on Apr 01, 2026 at 3:51 AM IST

---

# **Change in eligibility criteria to write oppe2 exam: A5>=40/100 AND A6>=40/100 AND A7>=40/100 AND A8>=40/100. and becoming eligible to give the end term exam.
****
Find the index of the row with maximum number of zeros in a matrix**

Given a m x n matrix, find the index of the row with the maximum number of zeros. Assume there will be only one row with the maximum number of zeros.

Example

```
[
    [1,0,1,4,1],
    [1,5,1,1,2],
    [2,0,2,0,3],
    [3,0,0,0,4],
]
```

The 4th row(index 3) has the maximum number of zeros, so the answer is 3.

**Template Code(Click to Expand)**

```

def row_index_with_most_number_of_zeros(matrix:list)->int:
    '''
    Given a matrix, find the index of the row with the
    maximum number of zeros in it.

    Arguments: matrix: list[list]
    Rertun: int - index of the row with the maximum number of zeros.
    '''
    ...


```


**NOTE: You can use the below tools for working out and debugging. Click to open them in new tab.**

[PythonTutor](https://livinnector.github.io/live-py-tutor/#code=%23%20Write%20your%20code%20here&cumulative=false&curInstr=0&heapPrimitives=false&mode=edit&origin=opt-live.js&py=3&rawInputLstJSON=%5B%5D&textReferences=false) | [Starboard Notebook](https://livinnectorpod.github.io/intro-to-python-lecture-notes) | [Pyodide Terminal](https://livinnector.github.io/live-py-tutor/pyodide-console.html)

---

### Public Tests ( 3/3 )

#### Case 1

**Input:**
```text
matrix = [
    [1, 0, 0, 0],
    [0, 1, 1, 0],
    [0, 0, 0, 1],
    [1, 1, 1, 1]
]
is_equal(
    row_index_with_most_number_of_zeros(matrix),
    0
)
```

#### Case 1

**Expected Output:**
```text
0
```

#### Case 1

**Actual Output:**
```text
0
```

#### Case 2

**Input:**
```text
matrix = [
    [1, 1, 1, 1],
    [0, 0, 1, 0],
    [1, 0, 0, 1],
    [0, 0, 0, 0]
]
is_equal(
    row_index_with_most_number_of_zeros(matrix),
    3
)
```

#### Case 2

**Expected Output:**
```text
3
```

#### Case 2

**Actual Output:**
```text
3
```

#### Case 3

**Input:**
```text
matrix = [
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [1, 1, 1, 0],
    [0, 0, 0, 1]
]
is_equal(
    row_index_with_most_number_of_zeros(matrix),
    1
)
```

#### Case 3

**Expected Output:**
```text
1
```

#### Case 3

**Actual Output:**
```text
1
```

### Private Tests ( 1/1 )

#### Case 1

**Input:**
```text
matrix = [
    [0, 1, 0, 0, 1],
    [0, 1, 1, 1, 1],
    [0, 0, 1, 0, 0],
    [1, 1, 0, 0, 1]
]
is_equal(
    row_index_with_most_number_of_zeros(matrix),
    2
)
matrix = [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [1, 1, 1, 0, 0],
    [1, 0, 0, 1, 1]
]
is_equal(
    row_index_with_most_number_of_zeros(matrix),
    1
)
matrix = [
    [1, 1, 1],
    [0, 0, 0],
    [1, 1, 1],
    [1, 0, 0]
]
is_equal(
    row_index_with_most_number_of_zeros(matrix),
    1
)
matrix = [
    [0, 0, 1, 1, 1, 1],
    [1, 1, 0, 0, 0, 0],
    [1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0]
]
is_equal(
    row_index_with_most_number_of_zeros(matrix),
    3
)
matrix = [
    [0, 0, 0],
    [0, 1, 0],
    [1, 0, 1],
    [0, 1, 0]
]
is_equal(
    row_index_with_most_number_of_zeros(matrix),
    0
)
```

#### Case 1

**Expected Output:**
```text
2

1

1

3

0
```

#### Case 1

**Actual Output:**
```text
2

1

1

3

0
```

---

### 💻 IITM Official Solution

```python

def row_index_with_most_number_of_zeros(matrix:list)->int:
    '''
    Given a matrix, find the index of the row with the
    maximum number of zeros in it.

    Arguments: matrix: list[list]
    Rertun: int - index of the row with the maximum number of zeros.
    '''


    # basic
    max_i, max_zeros = -1,-1 # since index and count cannot be less than 0
    for i in range(len(matrix)):
        n_zeros = matrix[i].count(0)
        if n_zeros>max_zeros:
            max_i = i
            max_zeros = n_zeros
    return max_i

    # functional approach
    # return max(range(len(matrix)), key= lambda x: matrix[x].count(0))
```

---

---

### 💻 My Submitted Code

```python
def row_index_with_most_number_of_zeros(matrix: list) -> int:
    max_zeros = -1
    best_index = 0

    # Iterate through indices to keep track of the row number
    for i in range(len(matrix)):
        current_zeros = matrix[i].count(0)
        if current_zeros > max_zeros:
            max_zeros = current_zeros
            best_index = i

    return best_index
```

---

