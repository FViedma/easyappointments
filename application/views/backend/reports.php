<script src="<?= asset_url('assets/ext/jquery-ui/jquery-ui-timepicker-addon.min.js') ?>"></script>
<script src="<?= asset_url('assets/js/backend_reports_api.js') ?>"></script>
<script src="<?= asset_url('assets/js/backend_reports.js') ?>"></script>
<script src="<?= asset_url('assets/ext/jsPDF/dist/jspdf.min.js') ?>"></script>

<script>
    var GlobalVariables = {
        csrfToken: <?= json_encode($this->security->get_csrf_hash()) ?>,
        availableServices: <?= json_encode($available_services) ?>,
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
                        <br>
                        <button type="button" class="print-reports btn btn-primary btn-sm mb-2" data-tippy-content="<?= lang('print') ?>">
                            <i class="fas fa-print mr-2"></i>
                            <?= lang('print') ?>
                        </button>
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