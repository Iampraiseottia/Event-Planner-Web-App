      
      <!----php code-->
      <?php 
            include("config.php");
            if(isset($_POST['submit'])) {
                $full_name = $_POST['full_name'];
                $email = $_POST['email'];
                $phone_number = $_POST['phone_number'];
                $password = $_POST['password'];
                $confirm_password = $_POST['confirm_password'];

    mysqli_query($con,"INSERT INTO user(full_name,email,phone_number,Password,confirm_password) VALUES('$full_name','$email','$phone_number','$password','$confirm_password')") or die("Error occurred");
            }
 else{
   
        }
        ?>

        <?php
            include('../html/category.html')
        ?>