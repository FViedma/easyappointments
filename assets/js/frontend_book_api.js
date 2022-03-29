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
})(window.FrontendBookApi);
