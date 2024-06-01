
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
    $admin_password = mysqli_real_escape_string($con, $_POST['admin_password']);
    $admin_email = mysqli_real_escape_string($con, $_POST['admin_email']);

    $result = mysqli_query($con, "SELECT * FROM admin_planner WHERE full_name = '$full_name' AND admin_email = '$admin_email' AND admin_phone_number = '$admin_phone_number'") or die("Select Error");
        $row = mysqli_fetch_assoc($result);
            
       if(is_array($row) && !empty($row)){
          $_SESSION['valid'] = $row['admin_password'];
         $_SESSION['full_name'] = $row['full_name'];
         $_SESSION['email'] = $row['admin_email'];

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