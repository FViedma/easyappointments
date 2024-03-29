<script src="<?= asset_url('assets/ext/jquery-ui/jquery-ui-timepicker-addon.min.js') ?>"></script>
<script src="<?= asset_url('assets/js/backend_reports_api.js') ?>"></script>
<script src="<?= asset_url('assets/js/general_functions.js') ?>"></script>
<script src="<?= asset_url('assets/js/backend_reports.js') ?>"></script>
<script src="<?= asset_url('assets/js/html5-qrcode.min.js') ?>"></script>
<script src="<?= asset_url('assets/ext/jsPDF/dist/jspdf.min.js') ?>"></script>

<script>
    var GlobalVariables = {
        csrfToken: <?= json_encode($this->security->get_csrf_hash()) ?>,
        availableServices: <?= json_encode($available_services) ?>,
        availableUsers: <?= json_encode($available_users) ?>,
        baseUrl: <?= json_encode($base_url) ?>,
    };

    $(function() {
        BackendReports.initialize(true);
    });
</script>

<div class="container-fluid backend-page" id="reports-page">
    <div class="row" id="reports">
        <div id="select-speciality" class="col col-12 col-md-5">
            <h3><?= lang('by_specialities') ?></h3>

            <div class="row">
                <div class="col-12 col-md-8" style="margin-left: 0;">
                    <div class="form-group">
                        <label class="control-label" for="select-service">
                            <?= lang('appointments_by_speciality') ?>
                        </label>
                        <select id="select-service" class="form-control">
                            <?php
                            echo '<option value = "0">' . lang('all_specialities') . '</option>';
                            foreach ($available_services as $service) {
                                echo '<option value="' . $service['id'] . '">' . $service['name'] . '</option>';
                            }
                            ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <div class="container">
                            <div class="row">
                                <div class="col">
                                    <label class="control-label" for="select-date">
                                        <?= lang('select_report_date') ?>
                                    </label>
                                    <input id="select-date" type="date" value="<?php echo date('Y-m-d'); ?>" />
                                </div>
                                <div class="col">
                                    <label class="control-label" for="select-date-end">
                                        <?= lang('select_report_date_end') ?>
                                    </label>
                                    <input id="select-date-end" type="date" value="<?php echo date('Y-m-d'); ?>" />
                                </div>
                            </div>
                            <div class="row">
                                <div class="col">
                                    <label class="control-label" for="quantity">
                                        <?= lang('quantity_appointments') ?>
                                    </label>
                                    <input type="number" name="quantity" id="quantity" placeholder="0" disabled>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <button type="button" class="print-reports btn btn-primary btn-sm mb-2" data-tippy-content="<?= lang('print') ?>">
                            <i class="fas fa-print mr-2"></i>
                            <?= lang('print') ?>
                        </button>
                    </div>
                </div>
            </div>

            <h3><?= lang('by_user') ?></h3>
            <div class="col-12 col-md-8" style="margin-left: 0;">
                <div class="form-group">
                    <label class="control-label" for="select-user">
                        <?= lang('users') ?>
                    </label>
                    <select id="select-user" class="form-control">
                        <?php
                        echo '<option value = "0">' . lang('all_users') . '</option>';
                        foreach ($available_users as $user) {
                            echo '<option value="' . $user['id'] . '">' . $user['first_name'] . " " . $user['last_name'] . '</option>';
                        }
                        ?>
                    </select>
                </div>
                <div class="form-group">
                    <div class="container">
                        <div class="row">
                            <div class="col">
                                <label class="control-label" for="select-date">
                                    <?= lang('select_report_date') ?>
                                </label>
                                <input id="select-date-user" type="date" value="<?php echo date('Y-m-d'); ?>" />
                            </div>
                            <div class="col">
                                <label class="control-label" for="select-date-end">
                                    <?= lang('select_report_date_end') ?>
                                </label>
                                <input id="select-date-end-user" type="date" value="<?php echo date('Y-m-d'); ?>" />
                            </div>
                        </div>
                        <div class="row">
                            <div class="col">
                                <label class="control-label" for="quantity">
                                    <?= lang('quantity_appointments') ?>
                                </label>
                                <input type="number" name="users-quantity" id="users-quantity" placeholder="0" disabled>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <button id="btn-query-users" type="button" class="query-reports btn btn-primary btn-sm mb-2" data-tippy-content="<?= lang('query') ?>">
                        <i class="fas fa-pager mr-2"></i>
                        <?= lang('query') ?>
                    </button>
                </div>
            </div>

            <h3><?= lang('by_ci') ?></h3>
            <div class="row">
                <div class="col-12 col-md-8" style="margin-left: 0;">
                    <div class="form-group">
                        <div class="row">
                            <div class="col-8">
                                <label class="control-label" for="input-ci">
                                    <?= lang('appointments_by_patient_id') ?>
                                </label>
                                <input id="input-ci" class="form-control" type="text">
                            </div>
                            <div class="col-4">
                                <label class="control-label" for="input-ci">
                                    <?= lang('complement') ?>
                                </label>
                                <input id="complement" class="form-control" type="text">
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <button id="btn-query" type="button" class="print-query btn btn-primary btn-sm mb-2" data-tippy-content="<?= lang('query') ?>">
                            <i class="fas fa-pager mr-2"></i>
                            <?= lang('query') ?>
                        </button>
                    </div>
                    <div class="form-group">
                        <div class="row">
                            <div class="col-12">
                                <div id="appointment-message">
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <div class="row">
                            <div class="col-12">
                                <div id="qr_reader" class="row">
                                    <div class="col">
                                        <div style="width:100%;" id="reader"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <div class="col col-12 col-md-5">
            <div class="col-12" style="float: center">
                <iframe class="preview-pane" type="application/pdf" width="100%" height="530" frameborder="1" style="position:relative;z-index:999"></iframe>
            </div>
        </div>
    </div>
</div>