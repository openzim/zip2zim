Dropzone.options.uploadZip = {
  paramName: "file", // The name that will be used to transfer the file
  maxFilesize: Infinity, // MB
  acceptedFiles: '.zip',
  maxFiles: 1,
  complete: function (res) {

    if (res.status !== 'success') {
      window.location.pathname = '/fail.html';
    } else {
        window.location.pathname = window.location.pathname + 'download/' + res.xhr.response;
    }
  }
};
