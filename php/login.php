<!-- <style>
        *{
            background: lightblue;
            text-align: center;
        }

        .message{
            margin-top: 200px;
            font-size: 35px;
            color: white;
        }

        .full{
            height: 50px;
            width: 150px;
            background: white;
            color: blue;
            border: 1px solid blue;
            border-radius: 5px;
            text-align: center;
            font-size: 18px;
            cursor: pointer;
        }

        span{
            color: blue;
        }
      </style> -->
       <?php
    session_start();

    include("config.php");

    if(isset($_POST['submit'])){
        $full_name = mysqli_real_escape_string($con, $_POST['full_name']);
        $password = mysqli_real_escape_string($con, $_POST['password']);
        $email = mysqli_real_escape_string($con, $_POST['email']);

        $result = mysqli_query($con, "SELECT * FROM user WHERE full_name = '$full_name' AND email = '$email' AND password = '$password'") or die("Select Error");
        $row = mysqli_fetch_assoc($result);
            
       if(is_array($row) && !empty($row)){
          $_SESSION['valid'] = $row['password'];
         $_SESSION['full_name'] = $row['full_name'];
         $_SESSION['email'] = $row['email'];

         include("../html/category.html");


        } else{
            $error_message = "Wrong Full Name, Email Address, or Password!";
            header("Location: ../html/login.html?error=" . urlencode($error_message));
            exit();
        }
    }

        ?>



<?php
if (isset($_POST['submit'])) {
    // Retrieve form data
    $full_name = mysqli_real_escape_string($con, $_POST['full_name']);
    $password = mysqli_real_escape_string($con, $_POST['password']);
    $email = mysqli_real_escape_string($con, $_POST['email']);

    $result = mysqli_query($con, "SELECT * FROM user WHERE full_name = '$full_name' AND email = '$email' AND password = '$password'") or die("Select Error");
        $row = mysqli_fetch_assoc($result);
            
       if(is_array($row) && !empty($row)){
          $_SESSION['valid'] = $row['password'];
         $_SESSION['full_name'] = $row['full_name'];
         $_SESSION['email'] = $row['email'];

         include("../html/category.html");


        } else {
        // Redirect back to login page with error message
        $error_message = "Wrong Full Name, Email Address, or Password!";
        header("Location: ../html/login.html?error=" . urlencode($error_message));
        exit();
    }
} else {
    // Redirect back to login page if accessed directly without form submission
    header("Location: ../html/login.html");
    exit();
}
?>