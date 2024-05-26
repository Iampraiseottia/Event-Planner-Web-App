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
    // echo "<div class='message'><p> Registration successfully!. Welcome to <span>EVENTIFY</span></p></div><br>";
    // echo "<a href='../html/category.html'><button class='btn full'>Continue...</button></a>";
            }
 else{
   
        }
        ?>

        <?php
            include('../html/category.html')
        ?>