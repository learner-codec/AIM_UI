add_standard_plugin_tests(PACKAGE "girder_dicom_viewer" NO_SERVER_TESTS)

add_python_test(dicom_viewer
  PLUGIN dicom_viewer
  EXTERNAL_DATA
  plugins/dicom_viewer/000000.dcm
  plugins/dicom_viewer/000001.dcm
  plugins/dicom_viewer/000002.dcm
  plugins/dicom_viewer/000003.dcm
)
