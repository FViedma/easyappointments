/* ----------------------------------------------------------------------------
 * Easy!Appointments - Open Source Web Scheduler
 *
 * @package     EasyAppointments
 * @author      A.Tselegidis <alextselegidis@gmail.com>
 * @copyright   Copyright (c) 2013 - 2020, Alex Tselegidis
 * @license     http://opensource.org/licenses/GPL-3.0 - GPLv3
 * @link        http://easyappointments.org
 * @since       v1.0.0
 * ---------------------------------------------------------------------------- */

window.FrontendBookApi = window.FrontendBookApi || {};

/**
 * Frontend Book API
 *
 * This module serves as the API consumer for the booking wizard of the app.
 *
 * @module FrontendBookApi
 */
(function (exports) {

    'use strict';

    var unavailableDatesBackup;
    var selectedDateStringBackup;
    var processingUnavailabilities = false;

    /**
     * Get Available Hours
     *
     * This function makes an AJAX call and returns the available hours for the selected service,
     * provider and date.
     *
     * @param {String} selectedDate The selected date of the available hours we need.
     */
    exports.getAvailableHours = function (selectedDate) {
        $('#available-hours').empty();

        // Find the selected service duration (it is going to be send within the "data" object).
        var serviceId = $('#select-service').val();

        // Default value of duration (in minutes).
        var serviceDuration = 15;

        var service = GlobalVariables.availableServices.find(function (availableService) {
            return Number(availableService.id) === Number(serviceId);
        });

        if (service) {
            serviceDuration = service.duration;
        }

        // If the manage mode is true then the appointment's start date should return as available too.
        var appointmentId = FrontendBook.manageMode ? GlobalVariables.appointmentData.id : null;

        // Make ajax post request and get the available hours.
        var url = GlobalVariables.baseUrl + '/index.php/appointments/ajax_get_available_hours';

        var data = {
            csrfToken: GlobalVariables.csrfToken,
            service_id: $('#select-service').val(),
            provider_id: $('#select-provider').val(),
            selected_date: selectedDate,
            service_duration: serviceDuration,
            manage_mode: FrontendBook.manageMode,
            appointment_id: appointmentId
        };

        $.post(url, data)
            .done(function (response) {
                // The response contains the available hours for the selected provider and
                // service. Fill the available hours div with response data.
                if (response.length > 0) {
                    var providerId = $('#select-provider').val();

                    if (providerId === 'any-provider') {
                        providerId = GlobalVariables.availableProvidersReservation[0].id; // Use first available provider.
                    }

                    var provider = GlobalVariables.availableProvidersReservation.find(function (availableProvider) {
                        return Number(providerId) === Number(availableProvider.id);
                    });

                    if (!provider) {
                        throw new Error('Could not find provider.');
                    }

                    var providerTimezone = provider.timezone;
                    var selectedTimezone = $('#select-timezone').val();
                    var timeFormat = GlobalVariables.timeFormat === 'regular' ? 'h:mm a' : 'HH:mm';

                    response.forEach(function (availableHour) {
                        var availableHourMoment = moment
                            .tz(selectedDate + ' ' + availableHour + ':00', providerTimezone)
                            .tz(selectedTimezone);

                        $('#available-hours').append(
                            $('<button/>', {
                                'class': 'btn btn-outline-secondary btn-block shadow-none available-hour',
                                'data': {
                                    'value': availableHour
                                },
                                'text': availableHourMoment.format(timeFormat)
                            })
                        );
                    });

                    if (FrontendBook.manageMode) {
                        // Set the appointment's start time as the default selection.
                        $('.available-hour')
                            .removeClass('selected-hour')
                            .filter(function () {
                                return $(this).text() === Date.parseExact(
                                    GlobalVariables.appointmentData.start_datetime,
                                    'yyyy-MM-dd HH:mm:ss').toString(timeFormat);
                            })
                            .addClass('selected-hour');
                    } else {
                        // Set the first available hour as the default selection.
                        $('.available-hour:eq(0)').addClass('selected-hour');
                    }

                    FrontendBook.updateConfirmFrame();

                } else {
                    $('#available-hours').text(EALang.no_available_hours);
                }
            });
    };

    /**
     * Register an appointment to the database.
     *
     * This method will make an ajax call to the appointments controller that will register
     * the appointment to the database.
     */
    exports.registerAppointment = function () {
        var $captchaText = $('.captcha-text');

        if ($captchaText.length > 0) {
            $captchaText.closest('.form-group').removeClass('has-error');
            if ($captchaText.val() === '') {
                $captchaText.closest('.form-group').addClass('has-error');
                return;
            }
        }

        var formData = JSON.parse($('input[name="post_data"]').val());

        var data = {
            csrfToken: GlobalVariables.csrfToken,
            post_data: formData
        };

        if ($captchaText.length > 0) {
            data.captcha = $captchaText.val();
        }

        if (GlobalVariables.manageMode) {
            data.exclude_appointment_id = GlobalVariables.appointmentData.id;
        }

        var url = GlobalVariables.baseUrl + '/index.php/appointments/ajax_register_appointment';

        var $layer = $('<div/>');
        $.ajax({
            url: url,
            method: 'post',
            data: data,
            dataType: 'json',
            beforeSend: function (jqxhr, settings) {
                $layer
                .appendTo('body')
                .css({
                    background: 'white',
                    position: 'fixed',
                    top: '0',
                    left: '0',
                    height: '100vh',
                    width: '100vw',
                        opacity: '0.5'
                    });
                }
            })
            .done(function (response) {
                if (response.captcha_verification === false) {
                    $('#captcha-hint')
                        .text(EALang.captcha_is_wrong)
                        .fadeTo(400, 1);

                    setTimeout(function () {
                        $('#captcha-hint').fadeTo(400, 0);
                    }, 3000);

                    $('.captcha-title button').trigger('click');

                    $captchaText.closest('.form-group').addClass('has-error');

                    return false;
                }
                printTicket(data, response.appointment_hash)
                window.location.href = GlobalVariables.baseUrl
                    + '/index.php/appointments/book_success/' + response.appointment_hash;
            })
            .fail(function (jqxhr, textStatus, errorThrown) {
                $('.captcha-title button').trigger('click');
            })
            .always(function () {
                $layer.remove();
            });
    };

    /**
     * Get the unavailable dates of a provider.
     *
     * This method will fetch the unavailable dates of the selected provider and service and then it will
     * select the first available date (if any). It uses the "FrontendBookApi.getAvailableHours" method to
     * fetch the appointment* hours of the selected date.
     *
     * @param {Number} providerId The selected provider ID.
     * @param {Number} serviceId The selected service ID.
     * @param {String} selectedDateString Y-m-d value of the selected date.
     */
    exports.getUnavailableDates = function (providerId, serviceId, selectedDateString) {
        if (processingUnavailabilities) {
            return;
        }

        if (!providerId || !serviceId) {
            return;
        }

        var appointmentId = FrontendBook.manageMode ? GlobalVariables.appointmentData.id : null;

        var url = GlobalVariables.baseUrl + '/index.php/appointments/ajax_get_unavailable_dates';

        var data = {
            provider_id: providerId,
            service_id: serviceId,
            selected_date: encodeURIComponent(selectedDateString),
            csrfToken: GlobalVariables.csrfToken,
            manage_mode: FrontendBook.manageMode,
            appointment_id: appointmentId
        };

        $.ajax({
            url: url,
            type: 'GET',
            data: data,
            dataType: 'json'
        })
            .done(function (response) {
                unavailableDatesBackup = response;
                selectedDateStringBackup = selectedDateString;
                applyUnavailableDates(response, selectedDateString, true);
            });
    };

    exports.applyPreviousUnavailableDates = function () {
        applyUnavailableDates(unavailableDatesBackup, selectedDateStringBackup);
    };

    function applyUnavailableDates(unavailableDates, selectedDateString, setDate) {
        setDate = setDate || false;

        processingUnavailabilities = true;

        // Select first enabled date.
        var selectedDate = Date.parse(selectedDateString);
        var numberOfDays = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();

        if (setDate && !GlobalVariables.manageMode) {
            for (var i = 1; i <= numberOfDays; i++) {
                var currentDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i);
                if (unavailableDates.indexOf(currentDate.toString('yyyy-MM-dd')) === -1) {
                    $('#select-date').datepicker('setDate', currentDate);
                    FrontendBookApi.getAvailableHours(currentDate.toString('yyyy-MM-dd'));
                    break;
                }
            }
        }

        // If all the days are unavailable then hide the appointments hours.
        if (unavailableDates.length === numberOfDays) {
            $('#available-hours').text(EALang.no_available_hours);
        }

        // Grey out unavailable dates.
        $('#select-date .ui-datepicker-calendar td:not(.ui-datepicker-other-month)').each(function (index, td) {
            selectedDate.set({ day: index + 1 });
            if (unavailableDates.indexOf(selectedDate.toString('yyyy-MM-dd')) !== -1) {
                $(td).addClass('ui-datepicker-unselectable ui-state-disabled');
            }
        });

        processingUnavailabilities = false;
    }

    /**
     * Save the user's consent.
     *
     * @param {Object} consent Contains user's consents.
     */
    exports.saveConsent = function (consent) {
        var url = GlobalVariables.baseUrl + '/index.php/consents/ajax_save_consent';

        var data = {
            csrfToken: GlobalVariables.csrfToken,
            consent: consent
        };

        $.post(url, data);
    };

    /**
     * Delete personal information.
     *
     * @param {Number} customerToken Customer unique token.
     */
    exports.deletePersonalInformation = function (customerToken) {
        var url = GlobalVariables.baseUrl + '/index.php/privacy/ajax_delete_personal_information';

        var data = {
            csrfToken: GlobalVariables.csrfToken,
            customer_token: customerToken
        };

        $.post(url, data)
            .done(function () {
                window.location.href = GlobalVariables.baseUrl;
            });
    };

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
                    $('#button-next-1').prop('disabled', true)
                    GeneralFunctions.displayMessageBox(EALang.message, EALang.patient_not_registered);
                } else {
                    if (response.length > 0) {
                        response.forEach(element => {
                            $('#form-message').empty()
                            $('#appointment-message').empty()
                            $('#nombre_paciente').val(element.HCL_NOMBRE)
                            $('#ape_paciente').val(element.HCL_APPAT + " " + element.HCL_APMAT)
                            $('#clinic_story').val(element.HCL_CODIGO)
                            var nombre = element.HCL_NOMBRE + " " + element.HCL_APPAT + " " + element.HCL_APMAT
                            $('#form-message').append(getPatientFoundHTML(nombre, element.HCL_NUMCI, element.HCL_CODIGO))
                            getPatientReservation(patientCI, complement)
                        });
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
                $('#button-next-1').prop('disabled', true)
                GeneralFunctions.displayMessageBox(EALang.message, EALang.patient_not_found);
            } else if (response.length >= 1) {
                var response = response[0]
                $('#button-next-1').prop('disabled', false)
                    var appointmentDate = new Date(response.book_datetime)
                    if (compareDates(appointmentDate, new Date())) {
                        $('#appointment-message').append(getAppointmentFoundHTML(response.book_datetime, response.service.name, response.provider.first_name, response.provider.last_name))
                        $('#button-next-1').prop('disabled', true)
                    }
                } else {
                    $('#button-next-1').prop('disabled', false)
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

    function getPatientFoundHTML(nombre, ci, hc) {

        return $('<div/>', {
            'class': 'card',
            'html': [
                $('<div/>', {
                    'class': 'card-header bg-success',
                    'html': [
                        $('<h5/>', {
                            'text': EALang.patient_registered,
                        })
                    ]
                }),
                $('<div/>', {
                    'class': 'card-text',
                    'text': "Paciente: " + nombre + " con CI: " + ci + " tiene la Historia Clínica: " + hc
                }),
            ]
        });
    }

    function getAppointmentFoundHTML(date, service, providerName, providerLastName) {

        return $('<div/>', {
            'class': 'card',
            'html': [
                $('<div/>', {
                    'class': 'card-header bg-success',
                    'html': [
                        $('<h5/>', {
                            'text': EALang.patient_appointed,
                        })
                    ]
                }),
                $('<div/>', {
                    'class': 'card-text',
                    'text': "El paciente ya cuenta con una reserva Reserva: " + date + " Especialidad: " + service + " Médico: " + providerName + " " + providerLastName
                }),
            ]
        });
    }

    function printTicket(data, hash) {
        var doctor = data.post_data.doctor;
        var appointment = data.post_data.appointment;
        var customer = data.post_data.customer;
        //QR
        new QRious({
            element: document.querySelector("#qr_code"),
            value: hash, // La URL o el texto
            size: 200,
            backgroundAlpha: 0, // 0 para fondo transparente
            foreground: "#000000", // Color del QR
            level: "H", // Puede ser L,M,Q y H (L es el de menor nivel, H el mayor)
          });
        let base64Image = $('#qr_code').attr('src');
        //pdf
        var doc = new jsPDF('p', 'pt', 'letter')
        //images as base64
        var imgData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/4QBkRXhpZgAATU0AKgAAAAgABQESAAMAAAABAAEAAAMCAAIAAAARAAAASlEQAAEAAAABAQAAAFERAAQAAAABAAALE1ESAAQAAAABAAALEwAAAABBZG9iZSBSR0IgKDE5OTgpAAD/4gJASUNDX1BST0ZJTEUAAQEAAAIwQURCRQIQAABtbnRyUkdCIFhZWiAHzwAGAAMAAAAAAABhY3NwQVBQTAAAAABub25lAAAAAAAAAAAAAAAAAAAAAAAA9tYAAQAAAADTLUFEQkUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAApjcHJ0AAAA/AAAADJkZXNjAAABMAAAAGt3dHB0AAABnAAAABRia3B0AAABsAAAABRyVFJDAAABxAAAAA5nVFJDAAAB1AAAAA5iVFJDAAAB5AAAAA5yWFlaAAAB9AAAABRnWFlaAAACCAAAABRiWFlaAAACHAAAABR0ZXh0AAAAAENvcHlyaWdodCAxOTk5IEFkb2JlIFN5c3RlbXMgSW5jb3Jwb3JhdGVkAAAAZGVzYwAAAAAAAAARQWRvYmUgUkdCICgxOTk4KQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWFlaIAAAAAAAAPNRAAEAAAABFsxYWVogAAAAAAAAAAAAAAAAAAAAAGN1cnYAAAAAAAAAAQIzAABjdXJ2AAAAAAAAAAECMwAAY3VydgAAAAAAAAABAjMAAFhZWiAAAAAAAACcGAAAT6UAAAT8WFlaIAAAAAAAADSNAACgLAAAD5VYWVogAAAAAAAAJjEAABAvAAC+nP/bAEMAAgEBAgEBAgICAgICAgIDBQMDAwMDBgQEAwUHBgcHBwYHBwgJCwkICAoIBwcKDQoKCwwMDAwHCQ4PDQwOCwwMDP/bAEMBAgICAwMDBgMDBgwIBwgMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDP/AABEIAOEA4QMBIgACEQEDEQH/xAAeAAEAAgIDAQEBAAAAAAAAAAAACAkHCgMEBgUCAf/EAGwQAAAEBAMDBQUPCg4NDQAAAAIDBAUAAQYHCBITCREUCiEiIzIVMTNBQhYaJDlDUVJTWGFidpS01RdXY3JzgYKSltIYJTQ1VnGDhJOVw9PU8CY2RFVZdHV3kaOxs/EZKTdFSVSXoaKkssLy/8QAGQEBAAMBAQAAAAAAAAAAAAAAAAIDBAEF/8QAMREBAAEDAgMHAgQHAAAAAAAAAAMBAgQREwUSFBUhMTJBUZEiMyNSYdEkQkNxc4Gh/9oADAMBAAIRAxEAPwC/yPk1pWTTbukHSoX5yQsrGxpDV7ivWnBJTIk5QJjMNMGKcghAAIZimKc90pSnOPrRVjypbG6ps5hWp6yVPKRp6svsvA2iGERoBFtxZ5OvLcAM5HBNEMsgwnfKYijjO/Lmn2y2t12lBji6e1ZxH7YK4lR0HgmQho+jaTcE01twnQYUipcVOU84AEKS56YeeQ5BlKZ26QMwQSFOUfW/5I3aA+7qWfI1v87E7tmvgNpHZ+4TKXt/TKJKFQiTlqXtwJJHqPbkOUpnqTM/WC6zfp6ngy5AB5ESJ0PfiVLqUFJxONHGvsOK7QjxDHSvvYl0eVabu+kFJQ8FGGgAMqUjTDJTIDIfYLUdDLM0MhB6rdbNg9xeUTjnsCy3GoBxEuYXgIgDKNDpqm5SCeU5KoL3zyHFi5hB3zlPmnKYgiCKfXxfWDY8UdgaqtvUBElLRWrca3HylMZfb7HTB6xnT/Ain3kyWNBThUxTV5g/rU8xaoXvi86n1xSQQM7kjkcFXI6Uw6gQnpUpRoJj6BciZS371Bcp2Wx89lb6egvdhCEUBCEIBCEIBCEIBCEIBCEIBCEIBCEIBCEIBCEIBCEIBCEIB3ooQPr982knKkEbTUS1wamOwDutm0oURpixLKTaZvAMUhSEWWJYKUpGacpT3FhlPfMMXJY7cSyXB9g8uPclSoZSTqTYlKtAW7HCKRrV2SYUiYYg9LrlAiipSDzzmZKUueKh+R9WSSipy9N0JiVcYNenpglDo9X1foqZn8IZk/HjbjfRFfLX0pp8ixHG9thrL7Oa4TDSNznKoEbtUSAx3QzTtBioo9NqTAPePyR9/mjzOFXbm2KxhXbnQ9BVE/vzslalTwo3sBhSXhiAZx9P+ueMMcqvpNvM2YYHiadN3UaasZiETifLrkJQzBgHPU7eQfPviEHJ+l+LKnbH3IX4a6HsG+tKyrZpnV1rU1QmdRKS0iLcnBwx5foUADM4Phnj78IsaPp9wWCl8p2wluE8plV1TLfPr9enzCuD9nqew/Pirjal33py3O0PtTjCtCCsiaKuMmJqkCo4wxpMdD21Twi1IAQpTMJEclShKnzT3yNmPdORkYIxyMNcD2tbs33WpSgaVrJ2rBkm9tdKSMMZVHFcF4OQx9PiCxjMM1PCdOLnuUk4EGW+OzcUPDU2o2pbZqUnBqITEGGykh8GeiLKK3ZdSehz7h6en4o22WRQX2a+os4pOoS6tpdsdSSziSXNKUrLLODlMLCYCQ5SFLxClKe6cvXj6cQo2D20DbMemAqmjD34l0uFQyUlkq9NwskpiZRIM5kmyLDKQZlGkyCIBgOgKYRylPeEUpTX388ePJZWy+ttfQIQhEQhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEAhCEBWpyqm9JFttlmopk5CYpMuPU7Y0EKAjlIKIaU3urnEGfOPMFvEXKUvGZKfij2XJ1rPOlkdkXa0LknSJVVRJjanIkn9XTLjJqidT4emZEPuWF3ec3BrstactCjk0Pq5RURjgIMxnplJWVCXIMt+6Qci02fe3zHk726e+2HCXZVLhxwwW4oBCq4tNRFMNrOQrNluNP0E4CdQf3TJG2W7bxba+9aiOm1Q2SqjaiOTAQ7XaqmjKWp3r50+3pyzUqhfLfkWGZu2MsG/JHn9mrsanTZouL+RS97KqdKVf5KVC2nlLOn0e6RhZZIFsjMmpnAWWD7pGXdpNtM7e7L60iSqa/C6KvNCrm3NTU1JyzlbopyTHzZxllgLB5YxmRCLCZtacYe1BbXSoMO9p7S0pRVOiLZ162tXlQbI5z8OMtOMkHOABBhPQmX1ep/oppfJtDsXl5LkHEddpyr+uMQ1av1aPEyzVzr3HTpDZGl5JEGl6OnkGWWWX+JKLC7NYdnWjMMLXbmrq2fq8dEbQazLajXlFkr3UswAwZ+jLtgLGCWp3x5On34rLorlOVS4YL+rLX4pbUTpWoqdceAe3qmlQDUpOeQBkKOFM6eiYWPUz6nYn45xcBSVRo6mpxudEKoKxGtTlqCDi/VyjOcBm74cQyb5fw9wUo8lGuEhsxi8xA2JRJFTiSQNUuSPR6wMjC0rQ4dzyyBkSLlvGPi5mTM3g727Tlv3yvTimnZa0MzW55T7isZ6fb0ra1o6XPPkST3pGHmshpn+s1P9MXLRLI779QhCEUhCEIBCEIBCEIBCEIBCEIBCEIBCEIBCEIBCEIBCEIDXc272KO3u1j2g1gKCsrWjHU0yhTZJvZJwgNxSpYpIMmGZmWczQgKJ39EM5SGKUt+/fKWwXTiDgG8Cf1iS/wDZOIa7K/CJbJxwT4d64UW5pVVWiOh0Og+dyE/FEaicGczPk7cTcTl5A74nJJzx7YpW5WdhmuFctmtrcCmUtQVPT9IqFKB0aUDfxZbUYYDOBYZk1B5R+D7HQ3b/ABx6bkym0WoCocA4bavDzS9KVBbt4UzPJUu5ZXdRKrM1wKM4wZPCHmF5NTU9DxbMsau6C1RvlMPN3t+/W+/7D4ERru1sdcMF+6yk+1RZOgXR10NDWIQcBuKBnydAkYPx4tpL/D7Qog28d/aax9bT9Shsg2qq+cmloKp4+bQ363dtcWoHn7ANQYC9TJrdjm8JGwBst8Nj5hLwA2utzVDq5Or7TbPorhKfCJjTzBnzTdsfVp9bQL5/Blgj71icFlq8LdNpGe29v6Vo1KjIM0D29AXJVuMMzjL1vD5BjjMWj/X90jmTm88W1IKrVFwGrDtytFla0DME8699qJt61QUfphTKgjWLuImHdPU3ltEivFu1d+/m3Tto8fvRUJte9jpiAxi7RWm762aqajaSBS7C2oW9SuXqErgnVJFCo7UBkLnl36+nun4t/NGILp0rtgravMkSGsl1ZJt5nolhTU54u9+qU5cWRY9ssdt1l9O+nqL2Zb5z78f2KF6LxY7WvC+idKwrCgHe47SjbZgNb3ZpaDy0/OCfEFp2kZaow2UgTllmKYdxg+bfKU5ZCw88rCcLZy4DFPZWqqBMUEmHIHdoZ1SUK83PLKlChVz3hygmLedNTOQpyl1YZTnOUJcW6zxrSv8AYXTQjCmFnaIWSxslqvqW3LpWsVCKYZHpUauUlRW8OeU5kjymbt0p8+XdvCKW/fKcZrjPW2tO6oQhCAQhCAQhCAQhCAQhCAQhCAQhCAQhCAQhCAjfskfSvbBfEds+bgiR4OzKI4bJH0r2wXxHbPm4IkZAYzxMPlUU1Y+sXCiG4LxWiVnUqGREcfoyPVafQLz5ehGr/YraDpbr3+UqcX1ZYh6n4RvLZwn0zUHcZVTqkg8chlqEodDodPrPVC8nqkbNGNFVXgcN1e/Uxb+Nr/zPqvM6QQeUSaoXafQLznDAWD1PtxSi4+aaobeKqIxtYKrmXBuQjZpJ0Nf0k2p170uLMVnHg1FKbqCRl59Pq9Qztxoxqx/1BnjYeUU+0zjGrJVbnFO1Xew9bnCSGlV69WZUqFbPh9PXSqSJGD0C9wNQszTn8CLiG0iNejYpbHC+DRtD6Nu9XFuXO0lA06oNf2ma5wSKnBbIcxlpUB+Ucj92mYMGcwsvU0wc0bDbNFeTFGO0SRzw0PfjsQjLSP2HXjxVw7Q0zcht4eqKdYn9LoGJ/R6cs7qh9vtx72EXCgHaM8nQulbfEq+XIwotrO2U8VwylIxI6iUoXhAvMMHJUYknIMgFk7sksnEeDzxi+xPKI8VWztpyl6DulTKNzZ6fO08lbtK1E/OTcWOUhlErxHZDjC+YEjBEm9EUpzGbOUbJkgy9ePLVjbxirRalm7MbQ7TS85HHt5arR+0z9iNVOIU00mpzCtjCnyszD/edwQtdftVRWxcTwqBKHAUy3hiIEXOcyygqCdykZhgN05S4WUt++W/vTnZDZS/FGYj7fIaroOqGWrKecABGSubFITy57wyFlFunvAOUhS3gHKQg7905SnFfu0y5O7Q+Pi4qWt2KpPqW1UmQTb1s2lnL4V76zeAw8HkDl3s4Igrb/YQY3dmecfW9k60YXB+MUSTGN1OOQUk1hYujMw0leXNMLcCe+UzJTMlPPu5xxdZFiT01iu5f0r4DYdhFLOBzlSznTF3Kht3i5plro6omt6m0mONLIzBpWMwvqzi1xMzjhZQmy5jSDDN+pKUywylvi1v9GZZ/669tfynRfzsYr4rra6VoMlwjG36Me0X11bb/AJTIv5yH6Me0X11bb/lMi/nI5y19hkmEY1KxlWhP7F1bbj+1qZFP+UiGOJblSOErDtUPclHVFQXDcCVKlIsLpZqEYWhGSLJPMcpEQUaEQ98giIGZKeWc+9OU58pZdXwoLGIivtKdrjbLZls7Gnqch6qytqsOCQx0hTgSD3ddnmIADhFmGA008zZSLmZzzzC3BCOcpylCm7HLCbIp7U1EsoCirgOtVJUwptZb2mSpWsR0w7wzPOIUGjkGW4c5hAAQhZN28OaQpYn2X+zRr/E1cldjgxXkPjs8kyHU1O0oBHIK1xCnLkJMrNKl2ZFSDKSdLLdzSAP7pdbDpTmv7qCzfZZ7T2ldqHY9ZUrIzu1L1DTaqTZUrEvDmE2LN098izpSynFCmEWUUsotwekAE+aJPxUnybHEDbJFV946DVsDxbO/dZVIrrB8pZ3QSbS1COZowpxIid28MiyhBmaVMU5yMGMYOqFLLaXcC6FN2naiF1UVCx00hVHySkqHVeUjKNOmEQpFhEYIMpjmEApyDKe+cgzn4pxTdTSvhoPQwjGk8Zlnw9+69tvynRfzse9ZHpHUrQkcW5WlXoFxIVCZUmNCaSoLHKQgjAMM5yEEUpynKcpzlOU98cHehCEAhCEBG/ZI+le2C+I7Z83BEjIjnskfSvbBfEds+bgiRkBiLFTixoXB1bVVW1xntNT1LJFCdvOXKPB6h/YL6MYMX7eLCWgEIn6uVFi6+RBfDqN+7PElr4sqR2tjVHGpU6gPchTzKA6hUuoH4o1Ftl3Wqe3WMu11QqLcOtykrVM3fTjQlLVKl/oQYB6ZY+rH2+s1I3cMwOosvqNq+xmOezOJGoJN1AXRtrWjuJN3QmiaKhRq18i/bNEAxmA8jtxlxo5w9/d9gjXAwkbJfEPiQx0Tu1bu2IsLdLtNUFuKJE4qVCU9sTEaGonIJya4wGF6nqen6nGyKznxllijoPpRyQhFYQhCARxmlZpRyQgOPQ9+OsrRb5R3YQEaMXGyysJjWa1v1QLb006OixKYhKdZJQEuCORnbMLOBzgM5t+fvxXxc3kddq6lrVUqoq6FUUUwrNOZLSe0J3UxPk+znDkZFzRpWaUcM0e71ossypI/tikvzl3TP1/qg/JBH/PQ85d0z9f6oPyQR/z0Xe5JQySjV2rmfnFWGHHkrWGqyhTCvq5O+3Hf2o8yZ57ueMpC69/JnRAHk0wdDofY4mNYPZlWDw3OCpwoiztA0ssWEcMrOTtAPRBff8qJAzRbvWjmDPJLvRklmkv8RXftPthhQ2Pi9Vq6uSyYaYVUk8J5VTIloLnKoWgGodw5gAZM/WZC/uZ50Twp6nW9pa0re35EqVnkUnIIInu0CgAyALjtuU0/HdLv+P2r8OCKWYvX4WaX3v8A8Rn3KjAGMbZe2bxrPKF4rOmRk1a3TkJBUzKpMbXtKCXkFqyeslGGT+Tx4enh/aVtSm3KuAFlU8SQ31dV655bzTcgy94yDzJlin04nCpc5AbNc/0LulrxADH1yh+wuD6mahKaarb7i1smImBCxMc9Yk8wU5l7z1Rc5lklgM5x6hhc90x5M8+aLdJLx+cVvJ98IdyKXQrXGhKZtjT9NnmuDouYv0qNPKkQPLqHyHu0QeE/c47/ACbO3S63uBuogN1fKa/tcqrZ2DbtWoKGSaSzknzT8xQuYksxQUecAsO+UgGyn5W6UOFWAbGzt2KuSvF9jC7B2hQqzODpkYTC1wihmykf6HlOQjjNPNpnKZ5e9OQBSnFzWG3DnSWEuyFO28oVrC0UxTCbh0hEhZxjnMUxmGmDnzjNMMEMwY584hjFOffiy76acg93CEIrCEIQEb9kj6V7YL4jtnzcESMiOeyR9K9sF8R2z5uCJGQGGsZ1mK3v5ZNyp6gK38wL+qPL/TSaAtXuKyDAcVpj5umWPv8Aiiq+w/JWauwx3Lp+sKKv8qa6ipRRxDWs7jFm6H7ebtg6fYi6dZ+rw/tRUztDOULXM2eGJBZQ9UWLa58YT3RYziKo1jVrZrnEcQMAAdAeoQOeT2GSNHDJMiT8KJYtGt0xubRQzSkfnLuo6pEBSdcumm0uNUgLAAajJ5GoPOPJ8OPUlE7oh3sl8eNytoZaZVXVXWtaqBox4KJVUstIf+MNdy9U4BmoTk6nsF/b5x+tEyYy3RSxyaXqyOSEIkEIQgEIRxwHJCEIBCOOEByQjjhAckI49f3oQHylzDNcsCdmF3txxM/BnRQBgiY8ae2HxB3hX03iZqK2tP0bUClIrUEDkJIWdrCCSmTogCCYCQiQakzJzyeKUpz3ylsHGLMgYqA5JKDInxaf5zRfy8Tj15NR6lVyaip8SlskbfiMxW3kuG8I1s1ZRTccnJaU05dgQCVJRs9SXfmLfKXi3eOcxMEex8w77PRSJdbC3DY1vg5zFN5XmGOTmXMRcixyLUHiGMkIgy6QCphDPfPmiTkIXS3181QhCEQCEIQCEIQEb9kj6V7YL4jtnzcESQiN+yR9K9sF8R2z5uCJIQHzXI/dGt/ysKo2yotpBSvc9ySqlSO3CZOeeQo/UJvHuHhMnYHGx+eTvXc+Xf4/ucRcrLYzYYK3rNzqBxtLSqp2dl/dBas0OuPUmD35x/fjbwvJsxp90eL5PJWDHWOystInbnJKtVM7Pw55ATyzTUXWD6seWJzFBzSjCGGDAnaLB26P6+21EsVKqqjkV3VUIE+iau084wanwOsHGakh2+M2VfuSbg7MIQisIQjjgOI1bulDjvflHy3tTKf6o/U27fM7f1coowxYbaHFJixx1vFvcHzfNwpWmTjEKRW0tRLtOozAbzBqhrFG5MURzT05znLnAPwneiccfOL5NfNKP4ULdFQtNbEnG3e9pU1NcjGvUFEVg8KZnKGmmyFalAhBKfRCUMtWmACYpc88hUpS9ecfQ87w4nP8INdP+L3D6VjmxHza6i2+Bos0oqQ87v4mv8IVdn5E4fSsfxfydjEkubuHFj/uhu9fgHD6Vi3Yi/P/AMFrC6tW1rD6JckSX7ueCUcf1RGP+/LB8vLininuSAI7g15NyvLiHrOv0egOUjELbwjnqznLJOZ6w9YXklKY+jpSnPfLnlHqvOW+GP64N9v4zaPo2O3RQ2+W+tf9C1n6orF/fxp+Xlx8upL80fQ7dxTxVjA1pJerqHAgsv8A074rJp3kbeGJjqFCsUVjed0So1BagxApcmoJC2QBb9M3TbwCmXPvTlIUp7p9+USC87P4H/rENv5RPH9LimltlvgPZ3L2zGG+3tMP64q89t3FzZm9QokgIeStU8wssZmmD4Y+hEQOSLW9fJYdr1XMXN6VvY7p1sJwaQSUiGeHSkZqgGDdlCEAjQyCOU95nSnOUpSDOcnae5OtgxpV/QuKGxrIWqbjy1BOq6uJ5cxAGEYZDLMUCAYHMAO8I5TlOXNOW6cTIpak2yhacQs7I2t7O0NpIU6RChTgTp0pYZbggLLBKQQhlLvSlKUpRO+sVLdI6VH04QhFQQhCAQhCAQhCAjfskfSvbBfEds+bgiSERv2SPpXtgviO2fNwRJCAgHtdcMWJfFlcS2rPYmrg2up+n1ClTUFVBeDNU6R5ehJP3PAD0Tk3anWDlLniqna813fvZoX+oG27fiYupVPdaj01QOq5eoLK9HGK1RAyywABqAJ6jsGGGGfZI2QHgnfKNdvlAbBcLGxjobKgt/Z26iprpGn/ADMHrlFP6XEKiF6oY9Pp9Mkep2/9XHq8Cvj6unVeQZnw54MsT2OTZgUvdmgcVl1ElxKsTqlK+nnFwLk1LpahgOHSnABqJR/D3mfaRa3gCp66tNYTqDb70KGtXctpQDSvZ6BRxRJ+maMBBmtkBnMGQAmZk93bzxDzk9V4n2jMHtK2Rqm11yqWqCkk6mZ69wbyymXSMUGDBpn62p/q4srI8cednSfi9w7BHjjkjjI8cckVhHXOP54588owzilxP0hg4srUFwLgvidhpenU/EHnz8KeZ5BRYO2M4fQ6AI5SPXuEJuUe7TBLhGwlqbf005yJr652ozyTkqAFK2xrGWPilgAC+x9QDvdYZGQOTeYJFWDzZwMbi86oalumdKrVxQzBC4Yk4sAUhe4cpCAPhglDMDPfuNMMlFemy9wh1Zt3NonUuJu7CtGkoOgakRhRM4G4vI6cEMRyNuAAQBFDRgkIMzhjmM2fMVLdvmMOwXG2eu1Z09PTxCEIRjCEIQCEIQCEIQCEIQCEIQCEIQCEIQCEIQEb9kj6V7YL4jtnzcESQiN+yR9K9sF8R2z5uCJIQHVGV6OlP3ojpir2pNhsE1aI6aufc5got9WN8nZOhXSPNNOSjGMsBnQAP1Qsf4kZkuTcJHbimnZ6d1IUjW1JzFShQdMsookosvOPnHGrxj0xS0ztQXK7976gr5JT9QU8pQs9s6HcDzCXB1YyzM5/QASYWMZmvqF9Z4TXhjQ6yDaHtPdBhvVQbZVFLvKV9p6oE5a9CuT9YUeSPsbo9YVLNKKMOSu7S4SAtZhrqhXzA1Heh1h8yiS5pvVkRcvug9QufWDM1D/YRd6iWd0Za/rRPLivgk2qj6ZHjjkjjI8cckQH5F25RWfypm0TZW+yYqB+XB4h0oOoGh3aZd6XEnryEXT/AHNUZFmAu3KIT7eiwTpfvZOXgp9h4UTonb0rzLiJ8xpaFcQtMl9uMtOMH34lB920ZD2ODSmZ9lLh1ClSp0slFvGRUbIkEgyNNNRFGGGT9cQxiEKc/HMU5xJeIOcnOve5332QFo17pwOZjSH02j4YEweg0B40ibUlOc952iUXnnLmmLfPdLfE445fTS6oQhCOBCEIBCEIBCEIBCEIBCEIBCEIBCEIBCEICN+yR9K9sF8R2z5uCJIRG/ZI+le2C+I7Z83BEjICG217wT3Ux4WMTW/txcduoJqdjzSKq4pv15vaEZGQCPf3wgz9MeSYOaUox5gw2W9cYTNnG/WoUOVon+tUnFJqVfD6Y6lOUfz+jPLOHqDP6wGTq8nsIyrtXMbFwMAtkfN7RVnxXbZ2kJymqZ93y2ounUJBYTJKJ5wD1vL6BYN8Q6wCcpBuBtC8V1P2xp/DokAldBDPdHoisdYtsQg3+ick0oM/i6G/fzy7/PFlIpdvdjGC7U8lRvRYSuGKsKIvowMVV0io4hkcJt+qcnO0xgB285eT1PJF49tG50b6IYk9QKUql/TICiF55EtMo9TklrjLl75m+PrtvijulFZZxXk5NZfujljkjjjkimMIw/jXoh0uRg3ulT7Cl4p2eKXcm9ER7caYnGWCMwR8RxR/pbzeJObF1PEVN8j2uBUjthBufRzw4LDGegarCgam1SAuRjXMwsRikO8HfCI/PPdPmlOQt3fnFv8AFF/JKbxuheJfElbsoKDzPcYOoxCmnHJWFXx56WUpmT5tOZQQ7gT55Tlvl5UXoRdk00kqEIQikIQhAIQhAIQhAIQhAIQhAIQhAIQhAIQhARv2SPpXtgviO2fNwRIyI57JH0r2wXxHbPm4IkhAQ226NUNtNbJ+/PdBybW2aykVSBPxB4Cdc0YOgUDN2xj72SKheSk3Opymse9as61QkTPFR0v6A9tP0DBjPLB8PTyRe9inwU2uxqMzY33NolhrRvZ1E1SAh3JGYUQcMGQZmTODpafN68Yjbth3hMQL5KE9hKCSn9ZuOITmEmy/DAONkWZtxVi9xx45ttVh92fDcs82FaNrnU4NSXmWYTy171M4BYB6ZhIB9T2/V9OJL2luSnu3bin6mRplSVJUTcU4EEn+FJLMLAMEhy9n05RHFNsTcKrdUSdwBY2gJuiU8pQSeegMON1QTz6mcQ+mLfL/AMolQ3M4EJe4qQU4fWJ704xclB9COSOOOSKowjpLCI7scZ/ijt/iKK9lHeBDY3lNeIy3zZTaMTfcB3d25OaQKSWTEBJIa8YglBBuGE4zo9+U5T3T3z7072IoL2itNXUwPbfAN87J2OqqsihNiNW5GIGFQuROx6ko8pcWI4ksyZRwy5gnIRe/dOUt8py3ynIEnlGGIo3/ALP+7Ev364fRUehLDdJd9NNRbnCKjfPFWI//AAfl2vlTl9Ex/fPFmIr3AN1/lbl9Ex3s+X2p80FuMIqP88VYivcA3Y+WuH0VH588X4ifcAXX+WuH0VHOz5f0+aC3KEVG+eL8RPuALr/LXD6Kh54vxE+4Auv8tcPoqJdnT+1Pmn7i3KEVG+eL8RPuALr/AC1w+ioeeL8RPuALr/LXD6Kh2dP7U+afuLcoRUb54vxE+4Auv8tcPoqP754sxFe4Buv8rcvomOdny+1PmgtxhFR/nirEV7gG7Hy1w+io/Pni/ET7gC6/y1w+io72dP7U+afuLcoRUb54vxE+4Auv8tcPoqHni/ET7gC6/wAtcPoqHZ0/tT5oLcoRUf54qxFe4Bux8tcPoqPkVZymG+1DU45vD3gQuWxNTMRxK5Y4OS8ghEV7aaITVLKD34h0U3sLh4RRj59DS/WDD+Wof6HCO9FN7Cz7ZI+le2C+I7Z83BGTLy4mbeYcUaA2vK0pejk7pMYUYndwLS8RMEt49PPPp7pTlP78Yy2S3pYFg/iM2fNwR8vaT7Pmh9o7YB2oisG1H3U0FMmN8mh4o2nVJgOgpI/EBnjIPVC2neHPN/062r/KhH+fHt63xIUBbe26WsKhrWmGGlFmloPa1xKJQn6ng8h4+rFn96cad2InD06YS8QFU0BVDMlVVBQrxw55J7fpFOun15Zmh4TRPL0/4eNij9HLhfvzsdktfVwy25dbb0imSpl9IqEslSVleCyupawJhdMBwDDJSL5pdWOfij0czhe1HZL7iW6DaS4fXFalSkXqtWoWLDy0xBMqnRahxo+wXu1O3Gctf3o18uT2bImnMYtbOuJavqTa0dGCd1R9HUjJnHJvCaYo4nULGPtpkhk9AvTl6mZF+IUiic93j8Z35kebk/QMQue0iw/Na9SlUXptcmVolJidQSdUKaRhRpfRMB4Ttg739d8fXofHzZC5FZoKfpm61v6gqB2mZwTe3PydUpWzLAMY9MABzzbgAHPm9aKO+VJYG7XYYbp2qqigaTaaXc657rkvcm7qiHM0kZZwDRg9unrD1DP2ozPyUnCDb2qqHrS7j1SjS7V201OBM1PSlMWcY15E+mZwg/I1NaPTj4ZZ0XVC8II90owQt2k+HlszEKL1WsIml375TqhH5H4cZxjVp5RHh+pPDjtO3SlqBpNgpZhV0i1uHANCAtKSepMMU5zMgPVBjinhmD1eRsjYeO2j+HtDLXFfO1e4Uup31Qj/AD479HbQax1yXZK0sF4LbOrqsUcOQiS1AjNPPNl6mAEjN8x+9FImyGrPAXaTZ3zd8QrbaF3r5JUDkQoTu7QQ4P55Wv1GQjwmTTjMOy3wW4YtoXiw+r5aCmbgWlT2nqgtUfSCohIY1L1RhcziDCAgH6DLADp5OhEJsXalvjkF4ev70YaqLaD2Noqo3RneLv23a3dnUGJlyNTUCYk5GYX2yzACM6A5e/GU+58Uacq+wh2sszRFtq2pmg6WaaorWtVs390IQAKOdZzSmGTkeMPa6zniOLj7+RSEW0EbUDDitl0b52q/KhH+fH5T7TfDm4L5pib6WpEqzaMpeahH4Tfl9sii3kxeFO1uK7FBdNvuLQdLV8laqXblyAh+QFryWs3ihlmSAAcSl2x3J2rdzsJVF0LGUr5k6xp0gbqfS7UnMNb3xKABchpy0oPAndDPnL/Di/Nw7MfJ6YXOIHhK4F6yc+SgPrBjuTNl/wAI1XtkLtibkYB7s0syqnlzrS11WOCdvXU8vcDNJrkef0FiHW8CPUOMz+2ZPsfNtLpFu8MV5uFJjd0g8ndS/lFWQp7uxWFWU/S7VM6SaSx1XlpCZHD35QZxz3ZugLm96MeoNpPh7cXNKnTXptWrVLlBSYglPU6M6Z5ozMgCwdZ25mDlHktqgyWzlgIuM8Xep5sf6LppAa5aK5v7oaCqRemQoAD2eoZ/641DaBXKGc1G4IOIblSMgpSidN+iYSpL6wBhZnwDMn4kaeEcN6z+cbyM1kp+tGHa52gFj7b1i507Ut2bfML60nyTrkLhUCdMoRj08+4YBj3g5oidgj21lI3N2U6q91aqpAdrYN/DVi1p5mKlUlwOrI+21+gZ+6DjXCvziFfMWd/q0uRVG7zQVw4ceu3J9LRK08gCywfYywA/gxwwuGVnyOmkG4VarF3aq/b6qbqHuLRVWOiIiSg8hpeSFZpBXtgwAHvye/GTIrE5Mra21ThgEpWv6Yt+w0/XychTS9RvkkIJLnlQQf1hmrLtAGPJ98uLN4wT2bUm0P1IcpeKMJ1ZtBrD0PVDqwv937bNLs0HzTLkC+oUxKhEaDojAYAY94PW+/OPxjaxZseDHC5WdzX9QlSo6SbzVJJB5+jxyvnAmRg+GYZpl/ukap2IO01y63twlxQVgmSqmC89YOXXp9PV7p8QMY9QHtPtY40cMw6T36X36DcDpSu2WuKabHhndEbq1uxPEo1iU+RxSkrdvzgGHtB9+I5bar0pbER/m+c/m8V28ldx9+aCm3TDnVDknWKqemY/UhrqAdalz7zkYPLGMgzUHzdABcWNbayf/NF4ifiA5/NxRXPjVx8jaqNR/uq2fscp/wCTwjr6HvwjfoNwDZI+le2C+I7Z83BEiND34ixsq7gMrXszbCEqHlrT5aHbdWR6kvq/Q4IkX9UBh/ZEz/Ly/wA+PEFQnKi9mGlri2yrEdQ7GnlVVJzLnWOgLTOdWwAAAAo9hqJ+h0+3Ivm8UVD4FrH3Cx0XqpXDxT9SOyWiq4eCqgfGpPqGt5BRBYM7ieAHY6sAC8/2QEbbdRVRTVSNitvUPbTNKsTzIP8A0wL8EYAYB+XEdsD+zgw6bOBwqBVacMmMVSElJ13E1QYv1yyJjGAsGsd0PCD/AB49aPilem6WQZ9w7WoY7B2op6hqXbZtNP0m3pm5Ai1pm6CYsGQHT8ofN05/1n7Z4I3t0fHS3GY936+MP3l5f58F9zGIQeoqSn/vry/z48f/ACCi/ldF2WOoLi2Vp5veml0dGdO7nrkCdQWcqQa+hkMMADsamn/84yhyRy+dIzszcW2UnwcqyRPJbxNpPlpGTQmF9WYR7PsdYX6n+HGfau5PZgpruuH+oHBnUidKjXqF67Rr1YWWepOGMY+iE/2Yxy3eLPHr8NmxKwiYSr+0vcihW3uVVNI6qhrOPrFQqKJzljJH1Zxw+hpmDj3u07Oi6VYnyWHNGsFymGu2O5O1gfjqfekronR0i0oFClAo1SiVADFOYowYOwOWcHQ9+Nl8Nzqa/ZIw/Ly/z4r4ceTq4HnF0VuBzGfJW6qTVB+jXrgXKZhg84/7qjJwnKsxsjdVoUbEKh8ElbbPZQ331+oz5vFbu7a59TcMU9Eoc/UmAOH1hPVx9eye0PwnbAlsrSlrb1ZWWIXzXPCZwdJoOE4RrKLIyAL4rwZ3kSyeEiWw+TbYEhT52NXz+G/s/cOv/wDdR9W1mwGwZWSuMxVRT7YpTO1NuBTkg4it1Kkkk0gecHUjO0xg7/bimWfdkvuNE+GqpErjTSVw/UqUZBajmn7MAB/hduKY+WB18x1Dbey1Kp3ps7vo39a4HoiFO84lLwmnqGZOwDU6uLkTrgse/wDtka/l6eILXK2BeDK9l1aqraoGOauqKueFTu7LyK2WE66pUaM8/qwKcgAzMMn0JRLBmjxsiyaRbtq4+SmXgo602MO55FUVE00wsqymm0hp49QWl7pG8WMYwEez8iLDtqTt17VYObJ1A0UvUjDcC5DtxLMhY2hwLO4E3T6Zivp9SSD4EdI/k2WBNw6lRTapV+3Xzh/s4mPZWG2FeCjDrVA3lhomlnT1DQf32bylI+yAApGZII/2o052XHkZN8yrRQZsksEr9tCcYlKUzS6dVKn6UcETvVLqnn1TUmLMAPUzj6AxmaHVl/A+xxt2pUeSUY8ti2W0sjRKSn6OlRlLsCLwCBvOTpUpPl9gHNHq/qk03KX6+tX8YF/nxmzsuTIv1kFT3Koce7XaXB9OzLE5JVlZ3DUFzekCeZao5O0AlrD1weEBqGAAAA/gTjweIjZUUziV2BNo3G27w2VPVVo6Sm/NToSoLJJXFGA13REPJ1efoafWe0evEucRexUwiYsb/v1yK+be61UVJpnLlpFaqEJR+QsBYC8hJwN3VgBGZcFOEmzGz3tQ6UVbITY10qrdxO55B79xxnEjAXn6Zg9+SWmX0IRZW1ybJyNYHAThXrDaE3pYrM0i5uiOnq1cCnh2mTMfCJ0qToDcVAA+WXraBf2Q+J48qTsRQ+HCo8N1L0gx0q1SaKYXM5p6dOnSquFSmJdDUyeQWYM8z93Pi2nCXs+MPeCa7VV1xbptYWuqq7mbJ0dDn6as2WofrjLI1hz0QGGD1MhfN1ZcY9v5sPMIWKG9NRXIrltE7VlVijiHQ4itFKUs43TADmAScAAerADvRupxPTN6qQQt5JpjKbaep+6Noagq5MlVKnZEupBjUiLKVKDTyFI1vDy8vpllj/4xd8UZIYZynzyTd86fVRXvRHJ6sFdt7h0/U7WyKgu1JuCZxazTq3WGyINIMAMvoDP3ZM4InYdXTFIWune2H5eX9v7OMOdJHJLvRikblGGNL9GtiQt/hHt/WrUjaVdQJk9YLfCpZLjz/QpZntwCPCGA9s04zrdHk5rm7YSlVDp8U901NPs7OXJqZHfhPM2SaQDOl1Cwg1NEszJ9kjISjk32BZ0OVa1OqVMlZ/EHf2eLe+Pp9nXiR9e4H7C3JwUNeHt54VVatpSokKNq7vTLOKLSmAGR14B6m/PIHTz+OUV0m266xjVlws4i6mwcX/pW5FL+iqgpFwNUaHEGFFOpQDMh6boA1Mh8bKG0ExM0diz2IV8bgW/fEtQUu/W/dhJz08+cPofpgGDyDC+fUBHgS+Ta4Ef7yKv/ABAcP6VHUxYYJbH7PHY84pqVtDwrS11XS65wOIPf5uBh6nhNHvnDGPyP9sbc7O6iXcGuH5mXL9hdafxcXCPKfU5S/wDd5/J4RPWoyk8f3L/kdD83BHVhCPGaHN/SP5OH/Vn73KhCI18w6JHjhPx/19nCESuHVK78v8YM/wB3H05f3L+1CEaJPIk5DuzHWI8cIRHG8UXIf4o4lP62fvgqEIhN9yo5jv7W5f5Q/lAR0W7vq/8AGIQjnrRY5Vkdg/xf4vCEWTeqtxo+9HYhCKrlbpx2Wz9bv3wXCERp6LnzZ/roq/r6oCO6b+uSqEI7ei5II+9CEcoOnCXf/g//AKQhHR2CPHHA9/2uOn+QFP8AuxwhCHzjGUIQj3Fb/9k=';
        var imgQRBorder='data:image/jpeg;base64,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';
  
        //Margin
        var pageMarginX = 30;
        var pageMarginY = 30;

        //Font Size
        var fontSizeTitle = 16;
        var fontSizeSubTitle = 8;
        var fontTextSize = 12;
        var fontTextSpace = 10;
        var fontSubTitleSpace = 3;
        var fontFinalTextSize=8;

        //Positions
        var fontSubTitleStartYPos =pageMarginY + 80;
        var fontTextStartYPos = fontSubTitleStartYPos + fontSizeSubTitle + fontSubTitleSpace;
        var dataStartX = pageMarginX + 140 
        var dataStartY = pageMarginY + 67 

        //images sizes
        var logoW = 30;
        var logoH = 40;
        var imageBorderW = 100;
        var imageBorderH = 100;
        var QRW = 80;
        var QRH = 80;

        //images Positions
        var logoposX= pageMarginX + 20;
        var logoposY= pageMarginY + 10;
        var QRBorderX = pageMarginX + 24;
        var QRBorderY = pageMarginY + 75;
        var QRX = pageMarginX + 35;
        var QRY = pageMarginY + 85;
        var topLineX = pageMarginX + 20;
        var topLineY = pageMarginX + 53;

        doc.setFont('helvetica')
        doc.setFontType('bold')
        doc.setFontSize(fontTextSize)
        doc.addImage(imgData, 'JPEG', logoposX,  logoposY, logoW, logoH);
        doc.setLineWidth(1.5)
        doc.line(topLineX, topLineY, 500, topLineY);
        doc.text(pageMarginX + 45,pageMarginY + 65, EALang.qr_code);
        doc.addImage(imgQRBorder, 'png', QRBorderX, QRBorderY, imageBorderW, imageBorderH);
        doc.addImage(base64Image, 'png', QRX, QRY, QRW, QRH);
        doc.setFontSize(fontSizeTitle)
        doc.text(dataStartX, dataStartY, 'Hospital Clínico Viedma');
        doc.setFontSize(fontSizeSubTitle)
        doc.text(dataStartX, fontSubTitleStartYPos, EALang.attention_date);
        doc.text(dataStartX + 150, fontSubTitleStartYPos, EALang.user_id);
        doc.text(dataStartX, fontSubTitleStartYPos+=(fontTextSize + fontTextSpace), EALang.service);
        doc.text(dataStartX, fontSubTitleStartYPos+=(fontTextSize + fontTextSpace), EALang.provider);
        doc.text(dataStartX, fontSubTitleStartYPos+=(fontTextSize + fontTextSpace), EALang.customer);
        doc.setFontSize(fontTextSize)
        doc.text(dataStartX, fontTextStartYPos, appointment.start_datetime);
        doc.text(dataStartX + 150, fontTextStartYPos, customer.user_ci);
        doc.text(dataStartX, fontTextStartYPos += (fontSizeSubTitle + fontTextSize + fontSubTitleSpace), doctor.speciality);
        doc.text(dataStartX, fontTextStartYPos += (fontSizeSubTitle + fontTextSize + fontSubTitleSpace), doctor.doctor_name);
        doc.text(dataStartX, fontTextStartYPos += (fontSizeSubTitle + fontTextSize + fontSubTitleSpace), customer.first_name);
        doc.text(dataStartX, fontTextStartYPos += fontTextSize, customer.last_name + fontSubTitleSpace);
        doc.setFontSize(fontFinalTextSize)
        doc.text(logoposX, fontTextStartYPos+=fontFinalTextSize+20, EALang.ticket_recomendation_first);
        doc.text(logoposX, fontTextStartYPos+=fontFinalTextSize, EALang.ticket_recomendation_second);
        doc.text(logoposX, fontTextStartYPos+=fontFinalTextSize, EALang.ticket_recomendation_third);
        var bottomLineY = fontTextStartYPos+=fontFinalTextSize;
        doc.line(logoposX, bottomLineY, 500, bottomLineY);
        doc.save('ficha.pdf');
    }
})(window.FrontendBookApi);
