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
         $('.print-reports').on('click', function () {
            var selectedSpeciality = $('#select-service').val();
            var date = $('#select-date').val();
            BackendReportsApi.getAppointmentsBySpecialities(selectedSpeciality,date);
        });
        $('#set-today-btn').on('click', function () {
            var parsedDate = Date.parse(new Date());
            $('#select-date').val(parsedDate.toString('yyyy-MM-dd'));
        });
    }

})(window.BackendReports);
