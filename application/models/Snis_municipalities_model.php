<?php defined('BASEPATH') or exit('No direct script access allowed');

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

/**
 * Snis Municipalities Model
 *
 * @package Models
 */
class Snis_municipalities_model extends EA_Model
{
    /**
     * Snis_municipalities_model constructor.
     */
    public function __construct()
    {
        parent::__construct();
        $this->load->helper('data_validation');
        $this->db_hcv = $this->load->database('snis', true);
    }

    /**
     * Get a specific row from the services db table.
     *
     * @param int $service_id The record's id to be returned.
     *
     * @return array Returns an associative array with the selected record's data. Each key has the same name as the
     * database field names.
     *
     * @throws Exception If $service_id argument is not valid.
     */
    public function get_row($municipality_id)
    {
        if (!is_numeric($municipality_id)) {
            throw new Exception('$municipality_id argument is not an numeric (value: "' . $municipality_id . '")');
        }
        return $this->db_hcv->get_where('municipio', ['codmunicip' => $municipality_id])->row_array();
    }

    /**
     * Get all, or specific records from service's table.
     *
     * Example:
     *
     * $this->Snis_munic->get_batch(['id' => $record_id]);
     *
     * @param mixed $where
     * @param int|null $limit
     * @param int|null $offset
     * @param mixed $order_by
     *
     * @return array Returns the rows from the database.
     */
    public function get_batch($where = NULL, $limit = NULL, $offset = NULL, $order_by = NULL)
    {
        if ($where !== NULL) {
            $this->db_hcv->where($where);
        }

        if ($order_by !== NULL) {
            $this->db_hcv->order_by($order_by);
        }

        return $this->db_hcv->get('municipio', $limit, $offset)->result_array();
    }

    /**
     * This method returns all Cochabamba's municipalities from the database.
     *
     * @return array Returns an object array with all the database services.
     */
    public function get_available_municipalities()
    {
        $result = $this->db_hcv
            ->select('codmunicip,nommunicip')
            ->from('provincia')
            ->join('municipio', 'provincia.codprovi = municipio.codprovi')
            ->where('coddepto', 3)
            ->order_by('nommunicip', 'ASC')
            ->get();
        return $result->result_array();
    }

    /**
     * This method returns all Cochabamba's municipalities from the database.
     *
     * @return array Returns an object array with all the database services.
     */
    public function get_available_medical_centers()
    {
        $currentYear = date("Y");
        $result = $this->db_hcv
            ->select('estabGest.codmunicip as codmunicip, codestabl, nomestabl ')
            ->from('provincia')
            ->join('municipio', 'provincia.codprovi = municipio.codprovi')
            ->join('estabGest', 'municipio.codmunicip = estabGest.codmunicip')
            ->where('coddepto', 3)
            ->where('idgestion', $currentYear)
            ->order_by('nomestabl', 'ASC')
            ->get();
        return $result->result_array();
    }
}
