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
    exports.getAppointmentsBySpecialities = function (id_specialiaty) {

        // Make ajax post request and get the appointments
        var url = GlobalVariables.baseUrl + '/index.php/Backend_api/ajax_get_appointments_by_specialities';

        var data = {
            csrfToken: GlobalVariables.csrfToken,
            speciality_value: id_specialiaty
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

    function printReport(data) {
        //We create a new object wher we are storing the specialities . 
        let grouped = {}
        //travel througth the array. 
        data.forEach(x => {
            if (!grouped.hasOwnProperty(x.speciality.name + " - " + x.doctor.first_name + " " + x.doctor.last_name)) {
                grouped[x.speciality.name + " - " + x.doctor.first_name + " " + x.doctor.last_name] = {
                    patients: []
                }
            }
            //We add the patients 
            grouped[x.speciality.name + " - " + x.doctor.first_name + " " + x.doctor.last_name].patients.push({
                name: x.patient.first_name,
                lastname: x.patient.last_name,
                clinical_story: x.patient.clinical_story,
                diagnostic: x.notes,
                municipality: x.municipality,
                medical_center: x.medical_center,
                doc_name: x.doctor.first_name,
                doc_last_name: x.doctor.last_name
            })
        });

        var doc = new jsPDF('p', 'pt', 'letter')
        var pageWidth = 612;
        var pageHeight = 792;
        var pageMargin = 30;
        var fontSizePatient = 10;
        var fontSizeSpeciality = 10;
        pageWidth -= pageMargin * 2;
        pageHeight -= pageMargin * 2;

        //los valores para las celdas de los datos, cada cuadrito se ve como una celda
        var cellMargin = 5;
        var cellWidth = 200;
        // Si se agregan más datos para mostrar en los pacientes, aumentar este valor
        var cellHeight = 60;
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
                    doc.text(startX, startYcell, patient_data.name + " " + patient_data.lastname);
                    doc.text(startX, startYcell + 10, patient_data.clinical_story);
                    doc.text(startX, startYcell + 20, patient_data.diagnostic + " ")
                    doc.text(startX, startYcell + 30, patient_data.municipality)
                    doc.text(startX, startYcell + 40, patient_data.medical_center)
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
            startYcell += cellHeight;
            startYTitle = startYcell;
            startYcell += titleHeight;
            startX = pageMargin;
        });


        var report = doc.output('bloburi')
        $('.preview-pane').attr('src', report);
    }


})(window.BackendReportsApi);
