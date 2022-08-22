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

window.BackendReports = window.BackendReports || {};

/**
 * Backend Reports
 *
 * Backend Reports javascript namespace. Contains the main functionality of the backend Reports
 * page. If you need to use this namespace in a different page, do not bind the default event handlers
 * during initialization.
 *
 * @module BackendReports
 */
(function (exports) {

    'use strict';

    /**
     * The page helper contains methods that implement each record type functionality
     * (for now there is only the ReportsHelper).
     *
     * @type {Object}
     */
    var helper = {};

    /**
     * This method initializes the backend Reports page. If you use this namespace
     * in a different page do not use this method.
     *
     * @param {Boolean} defaultEventHandlers Optional (false), whether to bind the default
     * event handlers or not.
     */
    exports.initialize = function (defaultEventHandlers) {
        defaultEventHandlers = defaultEventHandlers || false;

        // Add the available languages to the language dropdown.
        availableLanguages.forEach(function (language) {
            $('#language').append(new Option(language, language));
        });

        if (defaultEventHandlers) {
            bindEventHandlers();
        }
    };

    /**
     * Default event handlers declaration for backend Reports page.
     */
    function bindEventHandlers() {
        const video = document.getElementById('qr-video');
        const camList = document.getElementById('cam-list');

        const scanner = new QrScanner(video, result => setResult(camQrResult, result), {
            onDecodeError: error => {
                camQrResult.textContent = error;
                camQrResult.style.color = 'inherit';
            },
            highlightScanRegion: true,
            highlightCodeOutline: true,
        });

        $('.print-reports').on('click', function () {
            var selectedSpeciality = $('#select-service').val();
            var date = $('#select-date').val();
            BackendReportsApi.getAppointmentsBySpecialities(selectedSpeciality, date);
        });

        $('#btn-query').on('click', function (event) {
            event.preventDefault();
            if (!validatePacient()) {
                return; // Validation failed, do not continue.
            } else {
                var ci = $('#input-ci').val();
                var complement = $('#complement').val();
                BackendReportsApi.getAppointmentByCi(ci, complement);
            }
        });

        scanner.start().then(() => {
            // updateFlashAvailability();
            // List cameras after the scanner started to avoid listCamera's stream and the scanner's stream being requested
            // at the same time which can result in listCamera's unconstrained stream also being offered to the scanner.
            // Note that we can also start the scanner after listCameras, we just have it this way around in the demo to
            // start the scanner earlier.
            QrScanner.listCameras(true).then(cameras => cameras.forEach(camera => {
                const option = document.createElement('option');
                option.value = camera.id;
                option.text = camera.label;
                camList.add(option);
            }));
        });

        $('#start-button').on('click', () => {
            scanner.start();
        });
    
        $('#stop-button').on('click', () => {
            scanner.stop();
        });

    }

    function setResult(label, result) {
        console.log(result.data);
        // label.textContent = result.data;
        // camQrResultTimestamp.textContent = new Date().toString();
        // label.style.color = 'teal';
        // clearTimeout(label.highlightTimeout);
        // label.highlightTimeout = setTimeout(() => label.style.color = 'inherit', 100);
    }

    /**
    * This function validates the patient ci input. The user cannot continue
    * if it is not registered in the hospital database.
    * @returns {Boolean} Returns the validation result.
    */
    function validatePacient() {
        $('#input-ci .has-error').removeClass('has-error');
        // $('#message-reports label.text-danger').removeClass('text-danger');
        try {
            var missingRequiredField = false;
            var ci_value = $('#input-ci').val();
            if ('' == ci_value) {
                $('#input-ci').parents('.form-group').addClass('has-error');
                missingRequiredField = true;
            }
            if (missingRequiredField) {
                throw new Error(EALang.fields_are_required);
            }
            if (!GeneralFunctions.validateNumber($('#input-ci').val())) {
                $('#input-ci').parents('.form-group').addClass('has-error');
                throw new Error(EALang.invalid_ci_number);
            }
            return true;
        } catch (error) {
            $('#message-reports').text(error.message);
            return false;
        }
    }
    
})(window.BackendReports);
