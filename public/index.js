// "myAwesomeDropzone" is the camelized version of the HTML element's ID
Dropzone.options.uploadZip = {
  paramName: "file", // The name that will be used to transfer the file
  maxFilesize: 20, // MB
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
