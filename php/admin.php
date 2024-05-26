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
      
      <!----php code-->
      <?php 
            include("admin_config.php");
            if(isset($_POST['submit'])) {
                $admin_full_name = $_POST['admin_full_name'];
                $admin_company_name = $_POST['admin_company_name'];
                $admin_email = $_POST['admin_email'];
                $admin_phone_number = $_POST['admin_phone_number'];
                $admin_city_street = $_POST['admin_city_street'];
                $admin_country = $_POST['admin_country'];
                $admin_subject = $_POST['admin_subject'];
                $admin_request = $_POST['admin_request'];

    mysqli_query($con,"INSERT INTO admin_planner(admin_full_name,admin_company_name,admin_email,admin_phone_number,admin_city_street,admin_country,admin_subject,admin_request) VALUES('$admin_full_name','$admin_company_name','$admin_email','$admin_phone_number','$admin_city_street','$admin_country', '$admin_subject', '$admin_request')") or die("Error occurred");
    echo "<div class='message'><p> Registration successfully!. Welcome to <span>EVENTIFY</span>. We Verify You ASAP And Reach out To You</p></div><br>";
    echo "<a href='../index.html'><button class='btn full'>Close!</button></a>";
            }
 else{
   
        }
        ?>