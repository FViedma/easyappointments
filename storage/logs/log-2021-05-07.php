<?php defined('BASEPATH') OR exit('No direct script access allowed'); ?>

ERROR - 2021-05-07 18:01:58 --> Email could not been sent. Mailer Error (Line 166): Could not instantiate mail function.
ERROR - 2021-05-07 18:01:58 --> #0 C:\xampp_7_4\htdocs\easyappointments\application\libraries\Notifications.php(94): EA\Engine\Notifications\Email->send_appointment_details(Array, Array, Array, Array, Array, Object(EA\Engine\Types\Text), Object(EA\Engine\Types\Text), Object(EA\Engine\Types\Url), Object(EA\Engine\Types\Email), Object(EA\Engine\Types\Text), 'America/La_Paz')
#1 C:\xampp_7_4\htdocs\easyappointments\application\controllers\Appointments.php(489): Notifications->notify_appointment_saved(Array, Array, Array, Array, Array, false)
#2 C:\xampp_7_4\htdocs\easyappointments\vendor\codeigniter\framework\system\core\CodeIgniter.php(532): Appointments->ajax_register_appointment()
#3 C:\xampp_7_4\htdocs\easyappointments\index.php(341): require_once('C:\\xampp_7_4\\ht...')
#4 {main}
ERROR - 2021-05-07 21:19:40 --> Could not find the language line "language"
