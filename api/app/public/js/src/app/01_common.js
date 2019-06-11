window.addEventListener('popstate', function (e) {
    let stateObj = e.state;

    if (stateObj !== null) {

        $(".nav-link").parent().removeClass("active");
        $(".nav-link[href='" + stateObj.activePage + "']").parent().addClass("active");

        $(".page").hide();
        $('.modal').modal('hide');
        $(".dtPicker").datepicker("hide");

        $(stateObj.activePage).show();

        $("#myNavbar").collapse("hide");

    } else {
        window.history.back();
    }
});

window.jsonToHTMLTable = function (jsonObject) {

	let arrKeys = [];

	Object.keys(jsonObject).forEach(function (key) { 
		arrKeys.push(key);
	});

	let htmlTable = "<table class='table jSonDetailsTbl'>";

	arrKeys.forEach(function (key) {
		htmlTable += "<tr><td class='jSonDetailsLabel'>" + key + "</td><td><div>" + jsonObject[key] + "</div></td></tr>";
	});

	htmlTable += "</table>";

	return htmlTable;
}; 

window.isUserAuthenticated = function () {
	if (window.appState.userToken !== "") {
		return true;
	}

	$(".page").hide();
	$('#login-modal').modal('show');

	return false;
};

window.login = function (token) {
	window.appState.userToken = token;
	window.appState.lastTokenRefreshTime = new Date().getTime();
	sessionStorage.setItem("userToken", token);
};

window.logout = function () {
	window.appState.userToken = "";
	window.lastTokenRefreshTime = Number.MIN_VALUE;
	sessionStorage.removeItem("userToken");
	$(window).trigger("logout");
	window.isUserAuthenticated();
};

window.ajaxRequest = function (options) {
	$.ajax({
		type: options.method,
		url: options.url,
		cache: options.cache || false,
		data: options.data,
		headers: options.headers || {},
		success: function (response) {
			if (response.errorMessage !== undefined) {
				options.callback(response, null);
			} else {
				options.callback(null, response);
			}
		},
		error: function (err) {
			if (err.status && err.status === 401) {
				window.logout();
			}

			options.callback(err, null);
			console.log(err);
		}
	});
};

window.populateDropdown = function (dropdownSelector, list) {

	$(dropdownSelector).html('<option value="">All</option>');

	list.sort(function (x, y) {
		return ((x.name.toLowerCase() > y.name.toLowerCase()) ? 1 : -1);
	}).forEach(function (application) {

		$(dropdownSelector).append($('<option>', {
			value: application._id,
			text: application.name
		}));
	});
};

window.bootstrapPopup = function (options) {

    let cancelButtonTxt = options.cancelButtonTxt || null;
    let okButtonTxt = options.okButtonTxt || null;
    let okButtonType = options.okButtonType || null;
    let callback = options.callback || null;
    let modalSize = options.modalSize || '';

    let cancelButton = "";
    let okButton = "";

    if (cancelButtonTxt !== null && cancelButtonTxt !== undefined) {
        cancelButton = '<a href="#!" class="btn btn-default" data-dismiss="modal">' + cancelButtonTxt + '</a>';
    }

    if (okButtonTxt !== null && okButtonTxt !== undefined) {
        okButtonType = (okButtonType === null || okButtonType === undefined) ? "primary" : okButtonType;
        okButton = '<a href="#!" id="okButton" class="btn btn-' + okButtonType + '" data-dismiss="modal">' + okButtonTxt + '</a>';
    }

    let modal =
        $('<div class="modal fade" role="dialog" tabindex="-1">' +
			'<div class="modal-dialog ' + modalSize + '">' +
				'<div class="modal-content">' +
					'<div class="modal-header">' +
						'<button type="button" class="close" data-dismiss="modal">' +
						'<span>&times;</span>' +
						'</button>' +
						'<h4 class="modal-title">' + options.header + '</h4>' +
					'</div>' +
					'<div class="modal-body">' + options.body + '</div>' +
					'<div class="modal-footer">' + cancelButton + okButton + '</div>' +
				'</div>' +
			'</div>' +
		'</div>');

    modal.find('#okButton').click(function (event) {
        event.preventDefault();
        modal.modal('hide');
        if (callback) {
            return callback();
        }
	});
	
	$(modal).on('show.bs.modal', function () {
		setTimeout(function () {
			modal.find('#okButton').focus();
		}, 500);
	});	

	modal.modal('show');

	return modal;
};