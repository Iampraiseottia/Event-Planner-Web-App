<style>
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
      </style>
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

         echo "<div class='message'><p><b>Welcome!!!. <span>Sucessful Login</span></b></p></div><br>";
         echo "<a href='../html/category.html'><button class='btn full'>Proceed...</button></a>";


        } else{
          echo "<div class='message'><p><b>Wrong Full Name OR Email Address OR Password!!!</b></p></div><br>";
           echo "<a href='../html/login.html'><button class='btn full'>Try Again!!!</button></a>";
      }
    }

        ?>
