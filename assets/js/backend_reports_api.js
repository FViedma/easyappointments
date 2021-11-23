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

window.BackendReportsApi = window.BackendReportsApi || {};

/**
 * Backend Book API
 *
 * This module serves as the API consumer for the booking wizard of the app.
 *
 * @module BackendReportsApi
 */
(function (exports) {

    /**
     * Get Appointments by specialities
     *
     * This function makes an AJAX call and returns the appointments for the speciality
     * selected
     *
     * @param {int} id_specialiaty The selected speciality
     */
    exports.getAppointmentsBySpecialities = function (id_specialiaty, date) {

        // Make ajax post request and get the appointments
        var url = GlobalVariables.baseUrl + '/index.php/Backend_api/ajax_get_appointments_by_specialities';

        var data = {
            csrfToken: GlobalVariables.csrfToken,
            speciality_value: id_specialiaty,
            date_value: date
        };

        $.ajax({
            url: url,
            type: 'GET',
            data: data,
            dataType: 'json'
        })
            .done(function (response) {
                if (response.length > 0) {
                    printReport(response);
                }
            });
    };

    /**
     * Get Appointments by ci
     *
     * This function makes an AJAX call and returns the last appointment for the ci
     * input
     *
     * @param {int} ci The patient's ci
     */
    exports.getAppointmentByCi = function (ci, complement) {
        // Make ajax post request and get the appointments
        var url = GlobalVariables.baseUrl + '/index.php/Backend_api/ajax_get_appointment_by_ci';

        var data = {
            csrfToken: GlobalVariables.csrfToken,
            ci_value: ci,
            complement_ci: complement
        };

        $.ajax({
            url: url,
            type: 'GET',
            data: data,
            dataType: 'json'
        })
            .done(function (response) {
                if (response.length > 0 && response != "FAILURE") {
                    response = response[0];
                    $('#appointment-message').empty()
                    //acomodar los resultados de modo que se vean luego de presionar el boton
                    var nombre = response.customer.first_name + " " + response.customer.last_name
                    var doctorName = response.provider.first_name + " " + response.provider.last_name
                    $('#appointment-message').append(getPatientAppointmentFoundHTML(nombre, response.customer.user_ci,
                        response.start_datetime, response.service.name, doctorName, response.customer.clinical_story,
                        response.notes))
                } else {
                    $('#appointment-message').empty()
                    $('#appointment-message').append(appointmentNotFoundHTML())
                }
            });
    };
    function appointmentNotFoundHTML() {
        return $('<div/>', {
            'class': 'card',
            'html': [
                $('<div/>', {
                    'class': 'card-header bg-error',
                    'html': [
                        $('<h5/>', {
                            'text': EALang.patient_not_found,
                        })
                    ]
                }),
                $('<div/>', {
                    'class': 'card-text',
                    'style': 'white-space: pre-line;',
                    'text': "Paciente no tiene reserva para el presente día"
                }),
            ]
        });
    }

    function getPatientAppointmentFoundHTML(nombre, ci, datetime, especialidad, medico, hc, diagnostico) {

        return $('<div/>', {
            'class': 'card',
            'html': [
                $('<div/>', {
                    'class': 'card-header bg-success',
                    'html': [
                        $('<h5/>', {
                            'text': EALang.last_appointment,
                        })
                    ]
                }),
                $('<div/>', {
                    'class': 'card-text',
                    'style': 'white-space: pre-line;',
                    'text': "Paciente: " + nombre + '\n' +
                        "Historia Clinica: " + hc + '\n' +
                        "CI: " + ci + '\n' +
                        "Fecha reserva: " + datetime + '\n' +
                        "Especialidad: " + especialidad + '\n' +
                        "Medico: " + medico + '\n' +
                        "Diagnóstico: " + diagnostico
                }),
            ]
        });
    }

    function printReport(data) {
        //We create a new object wher we are storing the specialities . 
        let grouped = {}
        //travel througth the array. 
        data.forEach(x => {
            if (!grouped.hasOwnProperty(x.speciality.name + " - " + x.doctor.last_name + " " + x.doctor.first_name)) {
                grouped[x.speciality.name + " - " + x.doctor.last_name + " " + x.doctor.first_name] = {
                    patients: []
                }
            }
            //We add the patients 
            grouped[x.speciality.name + " - " + x.doctor.last_name + " " + x.doctor.first_name].patients.push({
                name: x.patient.first_name,
                lastname: x.patient.last_name,
                clinical_story: x.patient.clinical_story,
                diagnostic: x.notes == null ? "" : x.notes,
                municipality: x.municipality == null ? "" : x.municipality,
                medical_center: x.medical_center == null ? "" : x.medical_center,
                doc_name: x.doctor.first_name,
                doc_last_name: x.doctor.last_name,
                start_datetime: x.start_datetime
            })
        });

        var doc = new jsPDF('p', 'pt', 'letter')
        var pageWidth = 612;
        var pageHeight = 777;
        var pageMargin = 30;
        var fontSizePatient = 10;
        var fontSizeSpeciality = 10;
        pageWidth -= pageMargin * 2;
        pageHeight -= pageMargin * 2;

        //los valores para las celdas de los datos, cada cuadrito se ve como una celda
        var cellMargin = 5;
        var cellWidth = 200;
        // Si se agregan más datos para mostrar en los pacientes, aumentar este valor
        var cellHeight = 70;
        // el alto de la especialidad
        var titleHeight = 10;

        //desde donde se empieza a escribir en el eje x
        var startX = pageMargin;
        var startYTitle = pageMargin;
        var startYcell = pageMargin + titleHeight;

        Object.entries(grouped).forEach(([key, value]) => {
            doc.setFont('helvetica')
            doc.setFontType('bold')
            doc.setFontSize(fontSizeSpeciality)
            doc.text(pageMargin, startYTitle, key)
            Object.entries(value).forEach(([key, patients]) => {
                var patients_length = patients.length - 1;
                patients.forEach(patient_data => {
                    doc.setFont('courier')
                    doc.setFontType('normal')
                    doc.setFontSize(fontSizePatient)
                    doc.text(startX, startYcell, patient_data.name + " " + patient_data.lastname)
                    doc.text(startX, startYcell + 10, patient_data.clinical_story)
                    doc.text(startX, startYcell + 20, patient_data.start_datetime)
                    doc.text(startX, startYcell + 30, patient_data.diagnostic)
                    doc.text(startX, startYcell + 40, patient_data.municipality)
                    doc.text(startX, startYcell + 50, patient_data.medical_center)

                    if (patients.indexOf(patient_data) < patients_length) {
                        var nextPosX = startX + cellWidth + cellMargin;
                        if (nextPosX > pageWidth) {
                            startX = pageMargin;
                            startYcell += cellHeight;
                            if (startYcell >= pageHeight) {
                                doc.addPage();
                                startYcell = pageMargin;
                            }
                        } else {
                            startX = nextPosX;
                        }
                    }
                });
            });
            nextYtittle = startYcell; +cellHeight;
            if (Object.entries(grouped).findIndex(i => i.key === key) < Object.keys(grouped).length - 1) {
                if (nextYtittle > pageHeight) {
                    doc.addPage();
                    startX = pageMargin;
                    startYTitle = pageMargin;
                    startYcell = pageMargin + titleHeight;
                } else {
                    startYcell += cellHeight;
                    startYTitle = startYcell;
                    startYcell += titleHeight;
                    startX = pageMargin;
                }
            }
        });
        var report = doc.output('bloburi')
        $('.preview-pane').attr('src', report);
    }


})(window.BackendReportsApi);
