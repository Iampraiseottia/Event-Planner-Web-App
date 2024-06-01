      
      <!----php code-->
      <?php 
            include("config.php");
            if(isset($_POST['submit'])) {
                $full_name = $_POST['full_name'];
                $admin_email = $_POST['admin_email'];
                $admin_phone_number = $_POST['admin_phone_number'];
                $admin_password = $_POST['admin_password'];
                $admin_confirm_password = $_POST['admin_confirm_password'];

    mysqli_query($con,"INSERT INTO admin_planner(full_name,admin_email,admin_phone_number,admin_password,admin_confirm_password) VALUES('$full_name','$admin_email','$admin_phone_number','$admin_password','$admin_confirm_password')") or die("Error occurred");
            }
 else{
   
        }
        ?>

        <?php
            include('../html/category.html')
        ?>