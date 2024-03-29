<link rel="stylesheet" type="text/css" href="<?= asset_url('/assets/ext/jquery-fullcalendar/fullcalendar.min.css') ?>">

<script src="<?= asset_url('assets/ext/jquery-fullcalendar/fullcalendar.min.js') ?>"></script>
<script src="<?= asset_url('assets/ext/jquery-jeditable/jquery.jeditable.min.js') ?>"></script>
<script src="<?= asset_url('assets/ext/jquery-ui/jquery-ui-timepicker-addon.min.js') ?>"></script>
<script src="<?= asset_url('assets/ext/qrious/qrious.min.js') ?>"></script>
<script src="<?= asset_url('assets/ext/jsPDF/dist/jspdf.min.js') ?>"></script>
<script src="<?= asset_url('assets/js/working_plan_exceptions_modal.js') ?>"></script>
<script src="<?= asset_url('assets/js/backend_calendar.js') ?>"></script>
<script src="<?= asset_url('assets/js/backend_calendar_default_view.js') ?>"></script>
<script src="<?= asset_url('assets/js/backend_calendar_table_view.js') ?>"></script>
<script src="<?= asset_url('assets/js/backend_calendar_google_sync.js') ?>"></script>
<script src="<?= asset_url('assets/js/backend_calendar_appointments_modal.js') ?>"></script>
<script src="<?= asset_url('assets/js/backend_calendar_unavailability_events_modal.js') ?>"></script>
<script src="<?= asset_url('assets/js/backend_calendar_api.js') ?>"></script>
<script>
    var GlobalVariables = {
        csrfToken: <?= json_encode($this->security->get_csrf_hash()) ?>,
        availableProviders: <?= json_encode($available_providers) ?>,
        availableServices: <?= json_encode($available_services) ?>,
        baseUrl: <?= json_encode($base_url) ?>,
        dateFormat: <?= json_encode($date_format) ?>,
        timeFormat: <?= json_encode($time_format) ?>,
        firstWeekday: <?= json_encode($first_weekday) ?>,
        editAppointment: <?= json_encode($edit_appointment) ?>,
        customers: <?= json_encode($customers) ?>,
        secretaryProviders: <?= json_encode($secretary_providers) ?>,
        availableMunicipalities: <?= json_encode($available_municipalities) ?>,
        availableMedicalCenters: <?= json_encode($available_medical_centers) ?>,
        calendarView: <?= json_encode($calendar_view) ?>,
        timezones: <?= json_encode($timezones) ?>,
        user_display_name: <?= json_encode($user_display_name) ?>,
        user: {
            id: <?= $user_id ?>,
            email: <?= json_encode($user_email) ?>,
            timezone: <?= json_encode($timezone) ?>,
            role_slug: <?= json_encode($role_slug) ?>,
            privileges: <?= json_encode($privileges) ?>,
        }
    };

    $(function() {
        BackendCalendar.initialize(GlobalVariables.calendarView);
    });
</script>

<div class="container-fluid backend-page" id="calendar-page">
    <div class="row" id="calendar-toolbar">
        <div id="calendar-filter" class="col-12 col-sm-5">
            <div class="form-group calendar-filter-items">
                <select id="select-filter-item" class="form-control col" data-tippy-content="<?= lang('select_filter_item_hint') ?>">
                </select>
            </div>
        </div>
        <img id="qr_code" hidden>
        </img>
        <div id="calendar-actions" class="col-12 col-sm-7">
            <?php if (($role_slug == DB_SLUG_ADMIN || $role_slug == DB_SLUG_PROVIDER)
                && config('google_sync_feature') == TRUE
            ) : ?>
                <button id="google-sync" class="btn btn-primary" data-tippy-content="<?= lang('trigger_google_sync_hint') ?>">
                    <i class="fas fa-sync-alt"></i>
                    <span><?= lang('synchronize') ?></span>
                </button>

                <button id="enable-sync" class="btn btn-light" data-toggle="button" data-tippy-content="<?= lang('enable_appointment_sync_hint') ?>">
                    <i class="fas fa-calendar-alt mr-2"></i>
                    <span><?= lang('enable_sync') ?></span>
                </button>
            <?php endif ?>

            <?php if ($privileges[PRIV_APPOINTMENTS]['add'] == TRUE) : ?>
                <div class="btn-group">
                    <button class="btn btn-light" id="insert-appointment">
                        <i class="fas fa-plus-square mr-2"></i>
                        <?= lang('appointment') ?>
                    </button>

                    <button class="btn btn-light dropdown-toggle" id="insert-dropdown" data-toggle="dropdown">
                        <span class="caret"></span>
                        <span class="sr-only">Toggle Dropdown</span>
                    </button>

                    <div class="dropdown-menu">
                        <a class="dropdown-item" href="#" id="insert-unavailable">
                            <i class="fas fa-plus-square mr-2"></i>
                            <?= lang('unavailable') ?>
                        </a>
                        <a class="dropdown-item" href="#" id="insert-working-plan-exception" <?= $this->session->userdata('role_slug') !== 'admin' ? 'hidden' : '' ?>>
                            <i class="fas fa-plus-square mr-2"></i>
                            <?= lang('working_plan_exception') ?>
                        </a>
                    </div>
                </div>
            <?php endif ?>

            <button id="reload-appointments" class="btn btn-light" data-tippy-content="<?= lang('reload_appointments_hint') ?>">
                <i class="fas fa-sync-alt"></i>
            </button>

            <?php if ($calendar_view === 'default') : ?>
                <a class="btn btn-light" href="<?= site_url('backend?view=table') ?>" data-tippy-content="<?= lang('table') ?>">
                    <i class="fas fa-table"></i>
                </a>
            <?php endif ?>

            <?php if ($calendar_view === 'table') : ?>
                <a class="btn btn-light" href="<?= site_url('backend?view=default') ?>" data-tippy-content="<?= lang('default') ?>">
                    <i class="fas fa-calendar-alt"></i>
                </a>
            <?php endif ?>
        </div>
    </div>

    <div id="calendar">
        <!-- Dynamically Generated Content -->
    </div>
</div>


<!-- MANAGE APPOINTMENT MODAL -->

<div id="manage-appointment" class="modal fade" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title"><?= lang('edit_appointment_title') ?></h3>
                <button class="close" data-dismiss="modal">&times;</button>
            </div>

            <div class="modal-body">
                <div class="modal-message alert d-none"></div>

                <form>
                    <fieldset>
                        <legend><?= lang('appointment_details_title') ?></legend>

                        <input id="appointment-id" type="hidden">

                        <div class="row">
                            <div class="col-12 col-sm-6">
                                <div class="form-group">
                                    <label for="select-service" class="control-label">
                                        <?= lang('service') ?>
                                        <span class="text-danger">*</span>
                                    </label>
                                    <select id="select-service" class="required form-control">
                                        <?php
                                        // Group services by category, only if there is at least one service
                                        // with a parent category.
                                        $has_category = FALSE;
                                        foreach ($available_services as $service) {
                                            if ($service['category_id'] != NULL) {
                                                $has_category = TRUE;
                                                break;
                                            }
                                        }

                                        if ($has_category) {
                                            $grouped_services = [];

                                            foreach ($available_services as $service) {
                                                if ($service['category_id'] != NULL) {
                                                    if (!isset($grouped_services[$service['category_name']])) {
                                                        $grouped_services[$service['category_name']] = [];
                                                    }

                                                    $grouped_services[$service['category_name']][] = $service;
                                                }
                                            }

                                            // We need the uncategorized services at the end of the list so we will use
                                            // another iteration only for the uncategorized services.
                                            $grouped_services['uncategorized'] = [];
                                            foreach ($available_services as $service) {
                                                if ($service['category_id'] == NULL) {
                                                    $grouped_services['uncategorized'][] = $service;
                                                }
                                            }

                                            foreach ($grouped_services as $key => $group) {
                                                $group_label = ($key != 'uncategorized')
                                                    ? $group[0]['category_name'] : 'Uncategorized';

                                                if (count($group) > 0) {
                                                    echo '<optgroup label="' . $group_label . '">';
                                                    foreach ($group as $service) {
                                                        echo '<option value="' . $service['id'] . '">'
                                                            . $service['name'] . '</option>';
                                                    }
                                                    echo '</optgroup>';
                                                }
                                            }
                                        } else {
                                            foreach ($available_services as $service) {
                                                echo '<option value="' . $service['id'] . '">'
                                                    . $service['name'] . '</option>';
                                            }
                                        }
                                        ?>
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label for="select-provider" class="control-label">
                                        <?= lang('provider') ?>
                                        <span class="text-danger">*</span>
                                    </label>
                                    <select id="select-provider" class="required form-control"></select>
                                </div>
                                <div class="form-group">
                                    <h5><?= lang('reference_label') ?></h5>
                                </div>
                                <div class="form-group">
                                    <label for="appointment-select-municipality" class="control-label">
                                        <?= lang('select_municipality') ?>
                                    </label>
                                    <select id="appointment-select-municipality" class="form-control" maxlength="40">
                                        <option selected value=""><?= lang('select_municipality') ?></option>
                                        <?php
                                        foreach ($available_municipalities as $municipality) {
                                            echo '<option value="' . $municipality['codmunicip'] . '">' . $municipality['nommunicip'] . '</option>';
                                        }
                                        ?>
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label for="appointment-doctor" class="control-label"><?= lang('doctor_reference') ?></label>
                                    <input id="appointment-doctor" class="form-control"></input>
                                </div>
                            </div>

                            <div class="col-12 col-sm-6">
                                <div class="form-group">
                                    <label for="start-datetime" class="control-label"><?= lang('start_date_time') ?></label>
                                    <span class="text-danger">*</span>
                                    <input id="start-datetime" class="required form-control">
                                </div>

                                <div class="form-group">
                                    <label for="end-datetime" class="control-label"><?= lang('end_date_time') ?></label>
                                    <span class="text-danger">*</span>
                                    <input id="end-datetime" class="required form-control">
                                </div>
                                <div class="form-group">
                                    <br>
                                </div>
                                <div class="form-group">
                                    <label for="appointment-select-medical-center" class="control-label">
                                        <?= lang('medical_center') ?>
                                    </label>
                                    <select id="appointment-select-medical-center" class="selectpicker form-control">
                                        <option selected value=""><?= lang('medical_center') ?></option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="appointment-diagnostic" class="control-label"><?= lang('diagnostic') ?></label>
                                    <textarea id="appointment-diagnostic" class="form-control" rows="3"></textarea>
                                </div>
                            </div>
                        </div>
                    </fieldset>

                    <br>

                    <fieldset>
                        <legend>
                            <?= lang('customer_details_title') ?>
                            <button id="new-customer" class="btn btn-outline-secondary btn-sm" type="button" data-tippy-content="<?= lang('clear_fields_add_existing_customer_hint') ?>">
                                <i class="fas fa-plus-square mr-2"></i>
                                <?= lang('new') ?>
                            </button>
                            <button id="verify-patient" class="btn btn-outline-secondary btn-sm" type="button" data-tippy-content="<?= lang('verify_hint') ?>">
                                <i class="fas fa-check mr-2"></i>
                                <span>
                                    <?= lang('verify') ?>
                                </span>
                            </button>
                            <button id="select-customer" class="btn btn-outline-secondary btn-sm" type="button" data-tippy-content="<?= lang('pick_existing_customer_hint') ?>">
                                <i class="fas fa-hand-pointer mr-2"></i>
                                <span>
                                    <?= lang('select') ?>
                                </span>
                            </button>
                            <input id="filter-existing-customers" placeholder="<?= lang('type_to_filter_customers') ?>" style="display: none;" class="input-sm form-control">
                            <div id="existing-customers-list" style="display: none;"></div>
                        </legend>

                        <input id="customer-id" type="hidden">

                        <div class="row">
                            <div class="col-12 col-sm-6">
                                <div class="form-group">
                                    <label for="patient-ci" class="control-label">
                                        <?= lang('identification') ?>
                                        <span class="text-danger">*</span>
                                    </label>
                                    <input id="patient-ci" class="required form-control">
                                </div>
                                <div class="form-group">
                                    <label for="first-name" class="control-label">
                                        <?= lang('first_name') ?>
                                        <span class="text-danger">*</span>
                                    </label>
                                    <input id="first-name" class="required form-control">
                                </div>

                                <div class="form-group">
                                    <label for="last-name" class="control-label">
                                        <?= lang('last_name') ?>
                                        <span class="text-danger">*</span>
                                    </label>
                                    <input id="last-name" class="required form-control">
                                </div>

                                <div class="form-group">
                                    <label for="email" class="control-label">
                                        <?= lang('email') ?>
                                    </label>
                                    <input id="email" class="form-control">
                                </div>

                                <div class="form-group">
                                    <label for="phone-number" class="control-label">
                                        <?= lang('phone_number') ?>
                                        <?php if ($require_phone_number === '1') : ?>
                                            <span class="text-danger">*</span>
                                        <?php endif ?>
                                    </label>
                                    <input id="phone-number" class="form-control <?= $require_phone_number === '1' ? 'required' : '' ?>">
                                </div>
                            </div>
                            <div class="col-12 col-sm-6">
                                <div class="form-group">
                                    <label for="complement" class="control-label">
                                        <?= lang('complement') ?>
                                    </label>
                                    <input id="complement" class="form-control">
                                </div>

                                <div class="form-group">
                                    <label for="clinical-story" class="control-label">
                                        <?= lang('clinical_story') ?>
                                    </label>
                                    <input id="clinical-story" class="form-control">
                                </div>

                                <div class="form-group">
                                    <label for="address" class="control-label">
                                        <?= lang('address') ?>
                                    </label>
                                    <input id="address" class="form-control">
                                </div>

                                <div class="form-group">
                                    <label for="city" class="control-label">
                                        <?= lang('city') ?>
                                    </label>
                                    <input id="city" class="form-control">
                                </div>

                                <!-- <div class="form-group">
                                    <label for="customer-notes" class="control-label">
                                        <?= lang('notes') ?>
                                    </label>
                                    <textarea id="customer-notes" rows="2" class="form-control"></textarea>
                                </div> -->
                            </div>
                        </div>
                    </fieldset>
                </form>
            </div>

            <div class="modal-footer">
                <button class="btn btn-outline-secondary" data-dismiss="modal">
                    <i class="fas fa-ban"></i>
                    <?= lang('cancel') ?>
                </button>
                <button id="save-appointment" class="btn btn-primary">
                    <i class="fas fa-check-square mr-2"></i>
                    <?= lang('save') ?>
                </button>
            </div>
        </div>
    </div>
</div>

<!-- MANAGE UNAVAILABLE MODAL -->

<div id="manage-unavailable" class="modal fade" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title"><?= lang('new_unavailable_title') ?></h3>
                <button class="close" data-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="modal-message alert d-none"></div>

                <form>
                    <fieldset>
                        <input id="unavailable-id" type="hidden">

                        <div class="form-group">
                            <label for="unavailable-provider" class="control-label">
                                <?= lang('provider') ?>
                            </label>
                            <select id="unavailable-provider" class="form-control"></select>
                        </div>

                        <div class="form-group">
                            <label for="unavailable-start" class="control-label">
                                <?= lang('start') ?>
                                <span class="text-danger">*</span>
                            </label>
                            <input id="unavailable-start" class="form-control">
                        </div>

                        <div class="form-group">
                            <label for="unavailable-end" class="control-label">
                                <?= lang('end') ?>
                                <span class="text-danger">*</span>
                            </label>
                            <input id="unavailable-end" class="form-control">
                        </div>

                        <div class="form-group">
                            <label class="control-label"><?= lang('timezone') ?></label>

                            <ul>
                                <li>
                                    <?= lang('provider') ?>:
                                    <span class="provider-timezone">
                                        -
                                    </span>
                                </li>
                                <li>
                                    <?= lang('current_user') ?>:
                                    <span>
                                        <?= $timezones[$timezone] ?>
                                    </span>
                                </li>
                            </ul>
                        </div>

                        <div class="form-group">
                            <label for="unavailable-notes" class="control-label">
                                <?= lang('notes') ?>
                            </label>
                            <textarea id="unavailable-notes" rows="3" class="form-control"></textarea>
                        </div>
                    </fieldset>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline-secondary" data-dismiss="modal">
                    <i class="fas fa-ban"></i>
                    <?= lang('cancel') ?>
                </button>
                <button id="save-unavailable" class="btn btn-primary">
                    <i class="fas fa-check-square mr-2"></i>
                    <?= lang('save') ?>
                </button>
            </div>
        </div>
    </div>
</div>

<!-- SELECT GOOGLE CALENDAR MODAL -->

<div id="select-google-calendar" class="modal fade">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title"><?= lang('select_google_calendar') ?></h3>
                <button class="close" data-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="google-calendar" class="control-label">
                        <?= lang('select_google_calendar_prompt') ?>
                    </label>
                    <select id="google-calendar" class="form-control"></select>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline-secondary" data-dismiss="modal">
                    <i class="fas fa-ban mr-2"></i>
                    <?= lang('cancel') ?>
                </button>
                <button id="select-calendar" class="btn btn-primary">
                    <i class="fas fa-check-square mr-2"></i>
                    <?= lang('select') ?>
                </button>
            </div>
        </div>
    </div>
</div>

<!-- WORKING PLAN EXCEPTIONS MODAL -->

<?php require __DIR__ . '/working_plan_exceptions_modal.php' ?>