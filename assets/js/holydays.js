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

(function () {

    'use strict';

    /**
     * Class Holydays
     *
     * Contains the working plan functionality. The working plan DOM elements must be same
     * in every page this class is used.
     *
     * @class Holydays
     */
    var Holydays = function () {
        /**
         * This flag is used when trying to cancel row editing. It is
         * true only whenever the user presses the cancel button.
         *
         * @type {Boolean}
         */
        this.enableCancel = false;

        /**
         * This flag determines whether the jeditables are allowed to submit. It is
         * true only whenever the user presses the save button.
         *
         * @type {Boolean}
         */
        this.enableSubmit = false;
    };

    /**
     * Setup the dom elements of given holydays.
     *
     */
    Holydays.prototype.setup = function () {
        var appointments_unavailable = GlobalVariables.appointments_unavailable;
        var dateFormat;
        switch (GlobalVariables.dateFormat) {
            case 'DMY':
                dateFormat = 'dd/MM/yy';
                break;
            case 'MDY':
                dateFormat = 'MM/dd/yy';
                break;
            case 'YMD':
                dateFormat = 'yy/MM/dd';
                break;
            default:
                throw new Error('Invalid GlobalVariables.dateFormat value.');
        }
        $('.holydays tbody').empty();
        var timeFormat = GlobalVariables.timeFormat === 'regular' ? 'h:mm' : 'HH:mm';
        $.each(appointments_unavailable, function (index, unavailable) {
            $('<tr/>', {
                'html': [
                    $('<td/>', {
                        'class': 'holyday-name editable',
                        'text': unavailable.notes
                    }),
                    $('<td/>', {
                        'class': 'holyday-doctor-name editable',
                        'text': unavailable.provider.first_name + " " + unavailable.provider.last_name
                    }),
                    $('<td/>', {
                        'class': 'holyday-start editable',
                        'text': Date.parse(unavailable.start_datetime).toString(dateFormat+" "+timeFormat).toUpperCase()
                    }),
                    $('<td/>', {
                        'class': 'holyday-end editable',
                        'text': Date.parse(unavailable.end_datetime).toString(dateFormat+" "+timeFormat).toUpperCase()
                    }),
                    $('<td/>', {
                        'html': [
                            $('<button/>', {
                                'type': 'button',
                                'class': 'btn btn-outline-secondary btn-sm edit-holyday',
                                'title': EALang.edit,
                                'html': [
                                    $('<span/>', {
                                        'class': 'fas fa-edit'
                                    })
                                ]
                            }),
                            $('<button/>', {
                                'type': 'button',
                                'class': 'btn btn-outline-secondary btn-sm delete-holyday',
                                'title': EALang.delete,
                                'html': [
                                    $('<span/>', {
                                        'class': 'fas fa-trash-alt'
                                    })
                                ]
                            }),
                            $('<button/>', {
                                'type': 'button',
                                'class': 'btn btn-outline-secondary btn-sm save-holyday d-none',
                                'title': EALang.save,
                                'html': [
                                    $('<span/>', {
                                        'class': 'fas fa-check-circle'
                                    })
                                ]
                            }),
                            $('<button/>', {
                                'type': 'button',
                                'class': 'btn btn-outline-secondary btn-sm cancel-holyday d-none',
                                'title': EALang.cancel,
                                'html': [
                                    $('<span/>', {
                                        'class': 'fas fa-ban'
                                    })
                                ]
                            })
                        ]
                    })
                ]
            })
                .appendTo('.holydays tbody');
        }.bind(this));
        // Make holyday cells editable.
        this.editableHolyDayNameCell($('.holyday-name'));
        this.editableHolyDayDoctorNameCell($('.holyday-doctor-name'))
        this.editableDateTimeCell($('.holyday-start, .holyday-end'));
    };

    /**
     * Setup the dom elements of a given working plan exception.
     *
     * @param {Object} holydaysExceptions Contains the working plan exception.
     */
    Holydays.prototype.setupHolydaysExceptions = function (holydaysExceptions) {
        for (var date in holydaysExceptions) {
            var workingPlanException = holydaysExceptions[date];

            this
                .renderWorkingPlanExceptionRow(date, workingPlanException)
                .appendTo('.holydays tbody');
        }
    };

    // Make editable cells section 
    /**
     * Enable editable holyday day.
     *
     * This method makes editable the holyday day cells.
     *
     * @param {Object} $selector The jquery selector ready for use.
     */
    Holydays.prototype.editableHolyDayNameCell = function ($selector) {

        $selector.editable(function (value, settings) {
            return value;
        }, {
            type: 'text',
            data: '',
            event: 'edit',
            height: '30px',
            submit: '<button type="button" class="d-none submit-editable">Submit</button>',
            cancel: '<button type="button" class="d-none cancel-editable">Cancel</button>',
            onblur: 'ignore',
            onreset: function (settings, td) {
                if (!this.enableCancel) {
                    return false; // disable ESC button
                }
            }.bind(this),
            onsubmit: function (settings, td) {
                if (!this.enableSubmit) {
                    return false; // disable Enter button
                }
            }.bind(this)
        });
    };

    /**
  * Enable editable holyday doctor's name.
  *
  * This method makes editable the doctor's name cells.
  *
  * @param {Object} $selector The jquery selector ready for use.
  */
    Holydays.prototype.editableHolyDayDoctorNameCell = function ($selector) {
        var doctors = [];
        doctors[0] = EALang.all
        GlobalVariables.providers.forEach(function(provider, index) {
            doctors[provider.id] = provider.first_name + " " + provider.last_name;
        });

        $selector.editable(function (value, settings) {
            return value;
        }, {
            type: 'select',
            selected: 0,
            data: doctors,
            event: 'edit',
            height: '30px',
            submit: '<button type="button" class="d-none submit-editable">Submit</button>',
            cancel: '<button type="button" class="d-none cancel-editable">Cancel</button>',
            onblur: 'ignore',
            onreset: function (settings, td) {
                if (!this.enableCancel) {
                    return false; // disable ESC button
                }
            }.bind(this),
            onsubmit: function (settings, td) {
                if (!this.enableSubmit) {
                    return false; // disable Enter button
                }
            }.bind(this)
        });
    };
    /**
     * Enable editable holyday time.
     *
     * This method makes editable the holyday time cells.
     *
     * @param {Object} $selector The jquery selector ready for use.
     */
    Holydays.prototype.editableDateTimeCell = function ($selector) {
        $selector.editable(function (value, settings) {
            // Do not return the value because the user needs to press the "Save" button.
            return value;
        }, {
            event: 'edit',
            height: '30px',
            submit: $('<button/>', {
                'type': 'button',
                'class': 'd-none submit-editable',
                'text': EALang.save
            })
                .get(0)
                .outerHTML,
            cancel: $('<button/>', {
                'type': 'button',
                'class': 'd-none cancel-editable',
                'text': EALang.cancel
            })
                .get(0)
                .outerHTML,
            onblur: 'ignore',
            onreset: function (settings, td) {
                if (!this.enableCancel) {
                    return false; // disable ESC button
                }
            }.bind(this),
            onsubmit: function (settings, td) {
                if (!this.enableSubmit) {
                    return false; // disable Enter button
                }
            }.bind(this)
        });
    };

    /**
     * Binds the event handlers for the working plan dom elements.
     */
    Holydays.prototype.bindEventHandlers = function () {
        /**
         * Event: Add Holyday Button "Click"
         *
         * A new row is added on the table and the user can enter the new holyday
         * data. After that he can either press the save or cancel button.
         */
        $('.add-holyday').on('click', function () {
            var timeFormat = GlobalVariables.timeFormat === 'regular' ? 'h:mm' : 'HH:mm';
            var dateFormat;
            switch (GlobalVariables.dateFormat) {
                case 'DMY':
                    dateFormat = 'dd/MM/yy';
                    break;
                case 'MDY':
                    dateFormat = 'MM/dd/yy';
                    break;
                case 'YMD':
                    dateFormat = 'yy/MM/dd';
                    break;
                default:
                    throw new Error('Invalid GlobalVariables.dateFormat value.');
            }
            var $newHolyday = $('<tr/>', {
                'html': [
                    $('<td/>', {
                        'class': 'holyday-name editable',
                        'text': ""
                    }),
                    $('<td/>', {
                        'class': 'holyday-doctor-name editable',
                        'text': EALang.all
                    }),
                    $('<td/>', {
                        'class': 'holyday-start editable',
                        'text': Date.parse(new Date()).toString(dateFormat+"TT"+timeFormat)
                    }),
                    $('<td/>', {
                        'class': 'holyday-end editable',
                        'text': Date.parse(new Date()).toString(dateFormat+"TT"+timeFormat)
                    }),
                    $('<td/>', {
                        'html': [
                            $('<button/>', {
                                'type': 'button',
                                'class': 'btn btn-outline-secondary btn-sm edit-holyday',
                                'title': EALang.edit,
                                'html': [
                                    $('<span/>', {
                                        'class': 'fas fa-edit'
                                    })
                                ]
                            }),
                            $('<button/>', {
                                'type': 'button',
                                'class': 'btn btn-outline-secondary btn-sm delete-holyday',
                                'title': EALang.delete,
                                'html': [
                                    $('<span/>', {
                                        'class': 'fas fa-trash-alt'
                                    })
                                ]
                            }),
                            $('<button/>', {
                                'type': 'button',
                                'class': 'btn btn-outline-secondary btn-sm save-holyday d-none',
                                'title': EALang.save,
                                'html': [
                                    $('<span/>', {
                                        'class': 'fas fa-check-circle'
                                    })
                                ]
                            }),
                            $('<button/>', {
                                'type': 'button',
                                'class': 'btn btn-outline-secondary btn-sm cancel-holyday d-none',
                                'title': EALang.cancel,
                                'html': [
                                    $('<span/>', {
                                        'class': 'fas fa-ban'
                                    })
                                ]
                            })
                        ]
                    })
                ]
            })
                .appendTo('.holydays tbody');
            // Bind editable and event handlers.
            this.editableHolyDayNameCell($newHolyday.find('.holyday-name'));
            this.editableHolyDayDoctorNameCell($newHolyday.find('.holyday-doctor-name'))
            this.editableDateTimeCell($newHolyday.find('.holyday-start, .holyday-end'));
            $newHolyday.find('.edit-holyday').trigger('click');
            $('.add-holyday').prop('disabled', true);
        }.bind(this));

        /**
         * Event: Edit Break Button "Click"
         *
         * Enables the row editing for the "Breaks" table rows.
         */
        $(document).on('click', '.edit-holyday', function () {
            // Reset previous editable table cells.
            var $previousEdits = $(this).closest('table').find('.editable');
            var dateFormat;
            switch (GlobalVariables.dateFormat) {
                case 'DMY':
                    dateFormat = 'dd/MM/yy';
                    break;
                case 'MDY':
                    dateFormat = 'MM/dd/yy';
                    break;
                case 'YMD':
                    dateFormat = 'yy/MM/dd';
                    break;
                default:
                    throw new Error('Invalid GlobalVariables.dateFormat value.');
            }
    
            $previousEdits.each(function (index, editable) {
                if (editable.reset) {
                    editable.reset();
                }
            });

            // Make all cells in current row editable.
            $(this).parent().parent().children().trigger('edit');
            $(this).parent().parent().find('.holyday-start input, .holyday-end input').datetimepicker({
                dayNames: [EALang.sunday, EALang.monday, EALang.tuesday, EALang.wednesday,
                    EALang.thursday, EALang.friday, EALang.saturday],
                dayNamesShort: [EALang.sunday.substr(0, 3), EALang.monday.substr(0, 3),
                    EALang.tuesday.substr(0, 3), EALang.wednesday.substr(0, 3),
                    EALang.thursday.substr(0, 3), EALang.friday.substr(0, 3),
                    EALang.saturday.substr(0, 3)],
                dayNamesMin: [EALang.sunday.substr(0, 2), EALang.monday.substr(0, 2),
                    EALang.tuesday.substr(0, 2), EALang.wednesday.substr(0, 2),
                    EALang.thursday.substr(0, 2), EALang.friday.substr(0, 2),
                    EALang.saturday.substr(0, 2)],
                monthNames: [EALang.january, EALang.february, EALang.march, EALang.april,
                    EALang.may, EALang.june, EALang.july, EALang.august, EALang.september,
                    EALang.october, EALang.november, EALang.december],
                prevText: EALang.previous,
                nextText: EALang.next,
                currentText: EALang.now,
                closeText: EALang.close,
                dateFormat: dateFormat,
                timeFormat: GlobalVariables.timeFormat === 'regular' ? 'h:mm' : 'HH:mm',
                timeOnlyTitle: EALang.select_time,
                timeText: EALang.time,
                hourText: EALang.hour,
                minuteText: EALang.minutes
            });
            $(this).parent().parent().find('.holyday-name select').focus();

            // Show save - cancel buttons.
            var $tr = $(this).closest('tr');
            $tr.find('.edit-holyday, .delete-holyday').addClass('d-none');
            $tr.find('.save-holyday, .cancel-holyday').removeClass('d-none');
            $tr.find('select,input:text').addClass('form-control input-sm')

            $('.add-holyday').prop('disabled', true);
        });

        /**
         * Event: Delete Break Button "Click"
         *
         * Removes the current line from the "Breaks" table.
         */
        $(document).on('click', '.delete-holyday', function () {
            $(this).parent().parent().remove();
        });

        /**
         * Event: Cancel Break Button "Click"
         *
         * Bring the ".breaks" table back to its initial state.
         *
         * @param {jQuery.Event} event
         */
        $(document).on('click', '.cancel-holyday', function (event) {
            var element = event.target;
            var $modifiedRow = $(element).closest('tr');
            this.enableCancel = true;
            $modifiedRow.find('.cancel-editable').trigger('click');
            this.enableCancel = false;

            $(element).closest('table').find('.edit-holyday, .delete-holyday').removeClass('d-none');
            $modifiedRow.find('.save-holyday, .cancel-holyday').addClass('d-none');
            $('.add-holyday').prop('disabled', false);
        }.bind(this));

        /**
         * Event: Save Break Button "Click"
         *
         * Save the editable values and restore the table to its initial state.
         *
         * @param {jQuery.Event} e
         */
        $(document).on('click', '.save-holyday', function (event) {
            // Break's start time must always be prior to holyday's end.
            var element = event.target;
            var $modifiedRow = $(element).closest('tr');
            var start = Date.parse($modifiedRow.find('.holyday-start input').val());
            var end = Date.parse($modifiedRow.find('.holyday-end input').val());

            if (start > end) {
                $modifiedRow.find('.holyday-end input').val(start.addHours(1).toString(GlobalVariables.timeFormat === 'regular' ? 'h:mm tt' : 'HH:mm'));
            }

            this.enableSubmit = true;
            $modifiedRow.find('.editable .submit-editable').trigger('click');
            this.enableSubmit = false;

            $modifiedRow.find('.save-holyday, .cancel-holyday').addClass('d-none');
            $(element).closest('table').find('.edit-holyday, .delete-holyday').removeClass('d-none');
            $('.add-holyday').prop('disabled', false);

            // Refresh working plan to have the new holyday sorted in the holyday list.
            // var workingPlan = this.get();
            this.setup();
        }.bind(this));
    };

    /**
     * Enables or disables the timepicker functionality from the working plan input text fields.
     *
     * @param {Boolean} [disabled] If true then the timepickers will be disabled.
     */
    Holydays.prototype.timepickers = function (disabled) {
        disabled = disabled || false;
        var dateFormat;
        switch (GlobalVariables.dateFormat) {
            case 'DMY':
                dateFormat = 'dd/MM/yy';
                break;
            case 'MDY':
                dateFormat = 'MM/dd/yy';
                break;
            case 'YMD':
                dateFormat = 'yy/MM/dd';
                break;
            default:
                throw new Error('Invalid GlobalVariables.dateFormat value.');
        }
        if (disabled === false) {
            // Set timepickers where needed.
            $('.holydays input:text').datetimepicker({
                dayNames: [EALang.sunday, EALang.monday, EALang.tuesday, EALang.wednesday,
                    EALang.thursday, EALang.friday, EALang.saturday],
                dayNamesShort: [EALang.sunday.substr(0, 3), EALang.monday.substr(0, 3),
                    EALang.tuesday.substr(0, 3), EALang.wednesday.substr(0, 3),
                    EALang.thursday.substr(0, 3), EALang.friday.substr(0, 3),
                    EALang.saturday.substr(0, 3)],
                dayNamesMin: [EALang.sunday.substr(0, 2), EALang.monday.substr(0, 2),
                    EALang.tuesday.substr(0, 2), EALang.wednesday.substr(0, 2),
                    EALang.thursday.substr(0, 2), EALang.friday.substr(0, 2),
                    EALang.saturday.substr(0, 2)],
                monthNames: [EALang.january, EALang.february, EALang.march, EALang.april,
                    EALang.may, EALang.june, EALang.july, EALang.august, EALang.september,
                    EALang.october, EALang.november, EALang.december],
                prevText: EALang.previous,
                nextText: EALang.next,
                closeText: EALang.close,
                dateFormat: dateFormat,
                timeFormat: GlobalVariables.timeFormat === 'regular' ? 'h:mm' : 'HH:mm',
                currentText: EALang.now,
                timeOnlyTitle: EALang.select_time,
                timeText: EALang.time,
                hourText: EALang.hour,
                minuteText: EALang.minutes,

                onSelect: function (datetime, inst) {
                    // Start time must be earlier than end time.
                    var start = Date.parse($(this).parent().parent().find('.holyday-start').val()),
                        end = Date.parse($(this).parent().parent().find('.hoylyday-end').val());

                    if (start > end) {
                        $(this).parent().parent().find('.holyday-end').val(start.addHours(1).toString(GlobalVariables.timeFormat === 'regular' ? 'h:mm tt' : 'HH:mm'));
                    }
                }
            });
        } else {
            $('.holydays input').datetimepicker('destroy');
        }
    };

    /**
     * Reset the current plan back to the company's default working plan.
     */
    Holydays.prototype.reset = function () {

    };


    window.Holydays = Holydays;

})();
