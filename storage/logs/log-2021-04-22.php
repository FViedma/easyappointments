<?php defined('BASEPATH') OR exit('No direct script access allowed'); ?>

ERROR - 2021-04-22 21:10:25 --> Could not find the language line "language"
ERROR - 2021-04-22 21:16:21 --> Could not find the language line "language"
ERROR - 2021-04-22 21:29:07 --> Could not find the language line "language"
ERROR - 2021-04-22 21:29:08 --> Could not find the language line "language"
ERROR - 2021-04-22 21:29:25 --> Could not find the language line "language"
ERROR - 2021-04-22 21:29:37 --> Could not find the language line "language"
ERROR - 2021-04-22 21:29:39 --> Could not find the language line "language"
ERROR - 2021-04-22 21:32:01 --> Email could not been sent. Mailer Error (Line 166): Could not instantiate mail function.
ERROR - 2021-04-22 21:32:01 --> #0 C:\xampp_7_4\htdocs\easyappointments\application\libraries\Notifications.php(94): EA\Engine\Notifications\Email->send_appointment_details(Array, Array, Array, Array, Array, Object(EA\Engine\Types\Text), Object(EA\Engine\Types\Text), Object(EA\Engine\Types\Url), Object(EA\Engine\Types\Email), Object(EA\Engine\Types\Text), 'America/La_Paz')
#1 C:\xampp_7_4\htdocs\easyappointments\application\controllers\Appointments.php(489): Notifications->notify_appointment_saved(Array, Array, Array, Array, Array, false)
#2 C:\xampp_7_4\htdocs\easyappointments\vendor\codeigniter\framework\system\core\CodeIgniter.php(532): Appointments->ajax_register_appointment()
#3 C:\xampp_7_4\htdocs\easyappointments\index.php(341): require_once('C:\\xampp_7_4\\ht...')
#4 {main}
ERROR - 2021-04-22 21:34:37 --> Email could not been sent. Mailer Error (Line 166): Could not instantiate mail function.
ERROR - 2021-04-22 21:34:37 --> #0 C:\xampp_7_4\htdocs\easyappointments\application\libraries\Notifications.php(94): EA\Engine\Notifications\Email->send_appointment_details(Array, Array, Array, Array, Array, Object(EA\Engine\Types\Text), Object(EA\Engine\Types\Text), Object(EA\Engine\Types\Url), Object(EA\Engine\Types\Email), Object(EA\Engine\Types\Text), 'America/La_Paz')
#1 C:\xampp_7_4\htdocs\easyappointments\application\controllers\Backend_api.php(307): Notifications->notify_appointment_saved(Array, Array, Array, Array, Array, false)
#2 C:\xampp_7_4\htdocs\easyappointments\vendor\codeigniter\framework\system\core\CodeIgniter.php(532): Backend_api->ajax_save_appointment()
#3 C:\xampp_7_4\htdocs\easyappointments\index.php(341): require_once('C:\\xampp_7_4\\ht...')
#4 {main}
