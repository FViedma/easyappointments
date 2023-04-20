/* ----------------------------------------------------------------------------
 * Easy!Appointments - Open Source Web Scheduler
 *
 * @package     EasyAppointments
 * @author      A.Tselegidis <alextselegidis@gmail.com>
 * @copyright   Copyright (c) 2013 - 2020, Alex Tselegidis
 * @license     http://opensource.org/licenses/GPL-3.0 - GPLv3
 * @link        http://easyappointments.org
 * @since       v1.2.0
 * ---------------------------------------------------------------------------- */

/**
 * Backend Calendar API
 *
 * This module implements the AJAX requests for the calendar page.
 *
 * @module BackendCalendarApi
 */
window.BackendCalendarApi = window.BackendCalendarApi || {};

(function (exports) {

    'use strict';

    /**
     * Save Appointment
     *
     * This method stores the changes of an already registered appointment into the database, via an ajax call.
     *
     * @param {Object} appointment Contain the new appointment data. The ID of the appointment MUST be already included.
     * The rest values must follow the database structure.
     * @param {Object} [customer] Optional, contains the customer data.
     * @param {Function} [successCallback] Optional, if defined, this function is going to be executed on post success.
     * @param {Function} [errorCallback] Optional, if defined, this function is going to be executed on post failure.
     */
    exports.saveAppointment = function (appointment, customer, successCallback, errorCallback) {
        var url = GlobalVariables.baseUrl + '/index.php/backend_api/ajax_save_appointment';

        var data = {
            csrfToken: GlobalVariables.csrfToken,
            appointment_data: JSON.stringify(appointment)
        };

        if (customer) {
            data.customer_data = JSON.stringify(customer);
        }

        $.post(url, data)
            .done(function (response) {
                var appointment = response[0]
                var provider = response[1]
                var customer = response[2]
                var service = response[3]
                if (successCallback) {
                    successCallback(response['status']);
                }
                printTicketAppointment(appointment,customer, provider,service, response['number_ticket'])
            })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (errorCallback) {
                    errorCallback();
                }
            });
    };

    /**
     * Save unavailable period to database.
     *
     * @param {Object} unavailable Contains the unavailable period data.
     * @param {Function} successCallback The ajax success callback function.
     * @param {Function} errorCallback The ajax failure callback function.
     */
    exports.saveUnavailable = function (unavailable, successCallback, errorCallback) {
        var url = GlobalVariables.baseUrl + '/index.php/backend_api/ajax_save_unavailable';

        var data = {
            csrfToken: GlobalVariables.csrfToken,
            unavailable: JSON.stringify(unavailable)
        };

        $.post(url, data)
            .done(function (response) {
                if (successCallback) {
                    successCallback(response);
                }
            })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (errorCallback) {
                    errorCallback();
                }
            });
    };

    /**
     * Save working plan exception of work to database.
     *
     * @param {Date} date Contains the working plan exceptions data.
     * @param {Object} workingPlanException Contains the working plan exceptions data.
     * @param {Number} providerId Contains the working plan exceptions data.
     * @param {Function} successCallback The ajax success callback function.
     * @param {Function} errorCallback The ajax failure callback function.
     */
    exports.saveWorkingPlanException = function (date, workingPlanException, providerId,
        successCallback, errorCallback) {
        var url = GlobalVariables.baseUrl + '/index.php/backend_api/ajax_save_working_plan_exception';

        var data = {
            csrfToken: GlobalVariables.csrfToken,
            date: date,
            working_plan_exception: workingPlanException,
            provider_id: providerId
        };

        $.post(url, data)
            .done(function (response) {
                if (successCallback) {
                    successCallback(response);
                }
            })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (errorCallback) {
                    errorCallback();
                }
            });
    }

    exports.deleteWorkingPlanException = function (date, providerId, successCallback, errorCallback) {
        var url = GlobalVariables.baseUrl + '/index.php/backend_api/ajax_delete_working_plan_exception';

        var data = {
            csrfToken: GlobalVariables.csrfToken,
            date: date,
            provider_id: providerId
        };

        $.post(url, data)
            .done(function (response) {
                if (successCallback) {
                    successCallback(response);
                }
            })
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (errorCallback) {
                    errorCallback();
                }
            });
    }
    /**
        * Gets a patient by CI
        * 
        * @param {Number} patientCI patient ci.
        * @param {String} complement patient's ci complement
        */
    exports.getPatientByCI = function (patientCI, complement) {
        var url = GlobalVariables.baseUrl + '/index.php/Backend_api/ajax_get_patient_by_ci';
        var data = {
            patientCI: patientCI,
            complement: complement
        }
        $.ajax({
            url: url,
            type: 'GET',
            data: data,
            dataType: 'json'
        })
            .done(function (response) {
                if (response.length == 0) {
                    $('#form-message').empty()
                    $('#appointment-message').empty()
                    $('#save-appointment').prop('disabled', true)
                    GeneralFunctions.displayMessageBox(EALang.message, EALang.patient_not_found);
                } else {
                    if (response.length > 0) {
                        var regex = /[^0-9]+/;
                        var index = 0;
                        getPatientReservation(patientCI, complement)
                        while (index < response.length) {
                            var numCI = response[index].HCL_NUMCI.replace(regex, '')
                            if (numCI == patientCI) {
                                $('#first-name').val(response[index].HCL_NOMBRE);
                                $('#last-name').val(response[index].HCL_APPAT + " " + response[index].HCL_APMAT);
                                $('#clinical-story').val(response[index].HCL_CODIGO);
                                $('#phone-number').val(response[index].HCL_TELDOM);
                                $('#save-appointment').prop('disabled', false)
                                break;
                            }
                            index++;
                        }
                    } else {
                        $('#manage-appointment').find('#first-name, #last-name,#clinical-story').val('');
                    }
                }
            });
    };

    /**
    * Gets a reservation for an specific patient
    * 
    * @param {Number} patientCI patient ci.
    * @param {String} complement patient's ci complement
    */
    function getPatientReservation(patientCI, complement) {
        var url = GlobalVariables.baseUrl + '/index.php/Backend_api/ajax_get_patient_reservation';
        var data = {
            patientCI: patientCI,
            complement: complement
        }
        $.ajax({
            url: url,
            type: 'GET',
            data: data,
            dataType: 'json'
        })
            .done(function (response) {
                if (response == null) {
                    $('#appointment-message').empty()
                    GeneralFunctions.displayMessageBox(EALang.message, EALang.patient_not_found);
                } else if (response.length >= 1) {
                    var response = response[0]
                    var appointmentDate = new Date(response.book_datetime)
                    if (compareDates(appointmentDate, new Date())) {
                        GeneralFunctions.displayMessageBox(EALang.message, EALang.patient_reserved_already+" "+response.book_datetime);
                    }
                }
            });
    };

    function compareDates(date, currentDate) {
        var year = false;
        var month = false;
        var day = false;
        if (date.getFullYear() === date.getFullYear()) {
            year = true;
        }
        if (date.getMonth() === currentDate.getMonth()) {
            month = true;
        }
        if (date.getDate() === currentDate.getDate()) {
            day = true;
        }
        return year == month && month == day;
    }

    function printTicketAppointment(appointment, customer, doctor,service, number) {
        var doctor_name = doctor.first_name + " " + doctor.last_name;
        //QR
        new QRious({
            element: document.querySelector("#qr_code"),
            value: appointment.hash, // La URL o el texto
            size: 100,
            backgroundAlpha: 0, // 0 para fondo transparente
            foreground: "#000000", // Color del QR
            level: "H", // Puede ser L,M,Q y H (L es el de menor nivel, H el mayor)
        });
        let base64Image = $('#qr_code').attr('src');
        //pdf
        var doc = new jsPDF('p', 'pt', ['215', '313']);
        //images as base64
        var imgQRBorder = 'data:image/jpeg;base64,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';

        //Margin
        var pageMarginX = 15;
        var pageMarginY = 3;

        //images Positions
        var logoposX = pageMarginX + 5;
        var QRBorderX = pageMarginX + 52;
        var QRBorderY = pageMarginY + 185;
        var QRX = pageMarginX + 63;
        var QRY = pageMarginY + 195;
        var topLineX = pageMarginX + 10;
        var topLineY = pageMarginY;

        //Font Size
        var fontSizeTitle = 16;
        var fontSizeSubTitle = 8;
        var fontTextSize = 12;
        var fontTextSpace = 10;
        var fontSubTitleSpace = 3;
        var fontFinalTextSize = 8;


        //Positions
        var tiket_numberYPos = pageMarginY +35;
        var fontSubTitleStartYPos = pageMarginY + 45;
        var fontTextStartYPos = fontSubTitleStartYPos + fontSizeSubTitle + fontSubTitleSpace;
        var dataStartX = pageMarginX + 5
        var dataStartY = pageMarginY + 20

        //images sizes
  
        var imageBorderW = 100;
        var imageBorderH = 100;
        var QRW = 80;
        var QRH = 80;
        doc.setFont('helvetica')
        doc.setFontType('bold')
        doc.setFontSize(fontTextSize)
        doc.setLineWidth(1.5)
        doc.line(topLineX, topLineY, 200, topLineY);
        //codigo QR
        // doc.text(pageMarginX + 45, pageMarginY + 65, EALang.qr_code);
        //doc.addImage(imgQRBorder, 'png', QRBorderX, QRBorderY, imageBorderW, imageBorderH);
        doc.addImage(base64Image, 'png', QRX, QRY, QRW, QRH);
        doc.setFontSize(fontSizeTitle)
        doc.text(dataStartX, dataStartY, 'Hospital Clínico Viedma');
        doc.text(dataStartX, tiket_numberYPos, 'Ficha Nº:' + number);
        //Títulos
        doc.setFontSize(fontSizeSubTitle)
        doc.text(dataStartX, fontSubTitleStartYPos, EALang.attention_date);
        doc.text(dataStartX + 130, fontSubTitleStartYPos, EALang.user_id);
        doc.text(dataStartX, fontSubTitleStartYPos += (fontTextSize + fontTextSpace), EALang.service);
        doc.text(dataStartX, fontSubTitleStartYPos += (fontTextSize + fontTextSpace), EALang.provider);
        doc.text(dataStartX, fontSubTitleStartYPos += (fontTextSize + fontTextSpace), EALang.customer);
        doc.text(dataStartX, fontSubTitleStartYPos += ((2*fontTextSize) + fontTextSpace), EALang.user);
        doc.text(dataStartX, fontSubTitleStartYPos += (fontTextSize + fontTextSpace), EALang.booked);
        //Informacion
        doc.setFontSize(fontTextSize)
        doc.text(dataStartX, fontTextStartYPos, appointment.start_datetime);
        doc.text(dataStartX + 130, fontTextStartYPos, customer.user_ci);
        doc.text(dataStartX, fontTextStartYPos += (fontSizeSubTitle + fontTextSize + fontSubTitleSpace), service.name);
        doc.text(dataStartX, fontTextStartYPos += (fontSizeSubTitle + fontTextSize + fontSubTitleSpace), doctor_name);
        doc.text(dataStartX, fontTextStartYPos += (fontSizeSubTitle + fontTextSize + fontSubTitleSpace), customer.first_name);
        doc.text(dataStartX, fontTextStartYPos += fontTextSize, customer.last_name);
        doc.text(dataStartX, fontTextStartYPos += (fontSizeSubTitle +fontTextSize+ fontSubTitleSpace), appointment.user_display_name);
        doc.text(dataStartX, fontTextStartYPos += (fontSizeSubTitle + fontTextSize + fontSubTitleSpace), appointment.book_datetime);
        //texto horario admision
        doc.setFontSize(fontSizeSubTitle);
        doc.text(logoposX, fontTextStartYPos += fontFinalTextSize + 100, EALang.FirstAdmisionSch);
        doc.text(logoposX, fontTextStartYPos += fontFinalTextSize, EALang.SecondAdmisionSch);
        var bottomLineY = fontTextStartYPos += fontFinalTextSize;
        doc.line(logoposX, bottomLineY, 200, bottomLineY);
        doc.save('ficha.pdf');
    }
})(window.BackendCalendarApi);
