var schemaModule = angular.module('function.controller', ['database.services']);
schemaModule.controller("FunctionController", ['$scope', '$routeParams', '$location', 'Database', 'CommandApi', 'FunctionApi', 'DocumentApi', '$modal', '$q', '$route', 'Spinner', 'Notification', function ($scope, $routeParams, $location, Database, CommandApi, FunctionApi, DocumentApi, $modal, $q, $route, Spinner, Notification) {

    $scope.database = Database;
    $scope.listClasses = $scope.database.listClasses();
    $scope.editorOptions = {
        lineWrapping: true,
        lineNumbers: true,
        readOnly: false,
        mode: 'javascript',
        extraKeys: {
            "Ctrl-Enter": function (instance) {
                $scope.executeFunction();

            }
        },
        onLoad: function (_cm) {
            $scope.vcm = _cm;
            $scope.createNewFunction();
        }
    };
	$scope.icedcoffeescriptEditorOptions = $scope.editorOptions;
	$scope.icedcoffeescriptEditorOptions.mode = 'coffeescript';
	delete( $scope.icedcoffeescriptEditorOptions.onLoad );

	$scope.livescriptEditorOptions = $scope.editorOptions;
	$scope.livescriptEditorOptions.mode = 'livescript';
	delete( $scope.livescriptEditorOptions.onLoad );


	Database.setWiki("https://github.com/orientechnologies/orientdb-studio/wiki/Functions");
    $scope.functions = new Array;

	$scope.enableIcedCoffeeScript = true;
	$scope.enableLiveScript = true;

    $scope.consoleValue = '';                           //code of the function
    $scope.nameFunction = '';                           //name of the function
    $scope.selectedLanguage = '';                       //language of the function
    $scope.languages = [ 'SQL', 'Javascript' ];
	$scope.precompiledLanguageToPropertyNameMapping = {};
	if ( $scope.enableIcedCoffeeScript ) {
		$scope.languages.push( 'IcedCoffeeScript' );
		$scope.precompiledLanguageToPropertyNameMapping[ 'IcedCoffeeScript' ] = 'icedcoffeescript';
	}
	if ( $scope.enableLiveScript ) {
		$scope.languages.push( 'LiveScript' );
		$scope.precompiledLanguageToPropertyNameMapping[ 'LiveScript' ] = 'livescript';
	}

    $scope.functionToExecute = undefined;

    $scope.resultExecute = undefined;
    $scope.limit = -1;
    $scope.parametersToExecute = new Array;

    $scope.isNewFunction = false;

    var sqlText = 'select * from oFunction order by name';

	$scope.fixFunctionToExecuteForPrecompiledLanguages = function() {
		if ( $scope.functionToExecute ) {
			var debugString = "";
			var isPrecompiledLanguage = false;
			for ( var precompiledLanguageName in $scope.precompiledLanguageToPropertyNameMapping ) {
				if ( precompiledLanguageName !== $scope.functionToExecute[ 'language' ] ) {
					if ( $scope.functionToExecute[ 'language' ] == 'Javascript' && $scope.functionToExecute[ $scope.precompiledLanguageToPropertyNameMapping[ precompiledLanguageName ] ] ) {
						debugString += "Has property " + $scope.precompiledLanguageToPropertyNameMapping[ precompiledLanguageName ] + " so we will assume this is the language...\n";
						isPrecompiledLanguage = true;
						$scope.functionToExecute[ 'language' ] = precompiledLanguageName;
					}
					else {
						delete( $scope.functionToExecute[ $scope.precompiledLanguageToPropertyNameMapping[ precompiledLanguageName ] ] );
						debugString += "Deleting property " + $scope.precompiledLanguageToPropertyNameMapping[ precompiledLanguageName ] + "\n";
					}
				}
				else {
					isPrecompiledLanguage = true;
					debugString += "language " + $scope.precompiledLanguageToPropertyNameMapping[ precompiledLanguageName ] + "\n";
				}
			}

			if ( isPrecompiledLanguage ) {
				//make sure it has the right property
				var propertyName = $scope.precompiledLanguageToPropertyNameMapping[ $scope.functionToExecute[ 'language' ] ];
				if ( ! $scope.functionToExecute.hasOwnProperty( propertyName ) ) {
					$scope.functionToExecute[ propertyName ] = "";
					debugString += "Adding property " + propertyName + "\n";
				}

				//language should be javascript, NOT IcedCoffeeScript or LiveScript
				debugString += "Resetting language from " + $scope.functionToExecute[ 'language' ] + " to Javascript..." + "\n";
				$scope.functionToExecute[ 'language' ] = 'Javascript';
			}

			console.log( debugString );

		}
		else {
			console.log( "Not fixing functionToExecute, because it is not defined..." );
		}

	}

    $scope.getListFunction = function () {
        $scope.functions = new Array;
        $scope.functionsrid = new Array;
        CommandApi.queryText({database: $routeParams.database, language: 'sql', verbose: false, text: sqlText, limit: $scope.limit, shallow: false}, function (data) {
            if (data.result) {
                for (i in data.result) {
                    $scope.functions.push(data.result[i]);
                    $scope.functionsrid.push(data.result[i]['name'])
                }

                if ($scope.functions.length > 0 && $scope.functionToExecute != undefined) {
                    var index = $scope.functionsrid.indexOf($scope.functionToExecute['name']);
                    if (index != -1)
                        $scope.showInConsoleAfterSave($scope.functions[index]);
                }
            }
        });

    }
    $scope.clearConsole = function () {
        $scope.functionToExecute['code'] = '';

	    $scope.fixFunctionToExecuteForPrecompiledLanguages();
    }
    $scope.getListFunction();

    $scope.removeParam = function (index) {
        if ($scope.functionToExecute != undefined) {
            var numPar = parseInt($scope.functionToExecute['parameters']);

            var result = numPar - 1;

            $scope.functionToExecute['parameters'].splice(index, 1);

        }
        return result;
    }
    $scope.copyFunction = function () {
        if ($scope.functionToExecute != undefined) {

            var newFunc = JSON.parse(JSON.stringify($scope.functionToExecute));
            newFunc['name'] = $scope.functionToExecute['name'] + "_clone";
            newFunc['code'] = newFunc['code'] + ' ';
	        if ( $scope.enableIcedCoffeeScript && $scope.functionToExecute.hasOwnProperty( 'icedcoffeescript' ) ) {
		        newFunc['icedcoffeescript'] = newFunc['icedcoffeescript'] + ' ';
	        }
	        if ( $scope.enableliveScript && $scope.functionToExecute.hasOwnProperty( 'livescript' ) ) {
		        newFunc['livescript'] = newFunc['livescript'] + ' ';
	        }
	        $scope.fixFunctionToExecuteForPrecompiledLanguages();

            newFunc['$$hashKey'] = '';

            $scope.functions.push(newFunc);
            $scope.showInConsole(newFunc);
            $scope.isNewFunction = true;
        }
    }
    $scope.addParam = function () {


        if ($scope.functionToExecute['parameters'] == undefined) {
            $scope.functionToExecute['parameters'] = new Array;
        }


        var app = JSON.parse(JSON.stringify($scope.parametersToExecute));

        $scope.functionToExecute['parameters'].push('');
        $scope.inParams = $scope.functionToExecute['parameters'];

        $scope.$watch('inParams.length', function (data) {
            if (data) {
                $scope.parametersToExecute = new Array(data);
            }
            else {

                $scope.parametersToExecute = null;
            }
            var i;
            for (i in app) {
                $scope.parametersToExecute[i] = app[i];
            }


        });
    }
    $scope.
        executeFunction = function () {
        $scope.resultExecute = '';

        if ($scope.functionToExecute != undefined) {
            var functionNamee = $scope.nameFunction;
            var buildedParams = '';
            for (i in $scope.parametersToExecute) {
                buildedParams = buildedParams.concat($scope.parametersToExecute[i] + '/');
            }
            Spinner.start();
            FunctionApi.executeFunction({database: $routeParams.database, functionName: $scope.nameFunction, parameters: buildedParams, limit: $scope.limit}, function (data) {
                if (data.result) {
                    $scope.resultExecute = JSON.stringify(data.result);
                    Spinner.stopSpinner();
                }
                Spinner.stopSpinner();
            }, function (error) {
                $scope.resultExecute = error;
                Spinner.stopSpinner();
            });
        }
    }
    $scope.refreshPage = function () {

        $route.reload();
    }

    $scope.calculateNumParameters = function () {
        if ($scope.functionToExecute != undefined) {
            var numPar = parseInt($scope.functionToExecute['parameters']);
            var i = 0;
            var result = new Array;
            for (i = 0; i < numPar; i++) {

                result.push(numPar[i]);
            }
        }
        return result;
    }

    //when click on a function in list of functions

    $scope.showInConsoleAfterSave = function (selectedFunction) {
        $scope.consoleValue = selectedFunction['code'];
        $scope.nameFunction = selectedFunction['name'];
        $scope.selectedLanguage = selectedFunction['language'];
	    if ( $scope.enableIcedCoffeeScript && selectedFunction.hasOwnProperty( 'icedcoffeescript' ) ) {
		    $scope.selectedLanguage = 'IcedCoffeeScript';
		    $scope.consoleValue = selectedFunction[ 'icedcoffeescript' ];
	    }
		else if ( $scope.enableLiveScript && selectedFunction.hasOwnProperty( 'livescript' ) ) {
		    $scope.selectedLanguage = 'LiveScript';
		    $scope.consoleValue = selectedFunction[ 'livescript' ];
	    }

        $scope.functionToExecute = selectedFunction;
        $scope.inParams = $scope.functionToExecute['parameters'];
        //$scope.vcm.setValue($scope.consoleValue != null ? $scope.consoleValue : "");

	    $scope.fixFunctionToExecuteForPrecompiledLanguages();
    }

    $scope.showInConsole = function (selectedFunction) {

        $scope.showInConsoleAfterSave(selectedFunction);
        $scope.parametersToExecute = new Array;

        $scope.$watch('inParams.length', function (data) {
            if (data) {
                $scope.parametersToExecute = new Array(data);
            }
            else {
                $scope.parametersToExecute = null;
            }
        });


        $scope.isNewFunction = false;
    }

    $scope.modifiedLanguage = function (lang) {
        $scope.functionToExecute['language'] = lang;
	    $scope.fixFunctionToExecuteForPrecompiledLanguages();

    }
    $scope.createNewFunction = function () {

        var newDoc = DocumentApi.createNewDoc('ofunction');
        $scope.showInConsole(newDoc);
        $scope.isNewFunction = true;

    }
    $scope.saveFunction = function () {
        $scope.resultExecute = '';
        if ($scope.functionToExecute['language'] != undefined && $scope.functionToExecute['name'] != undefined && $scope.functionToExecute['name'] != '') {
            if ($scope.isNewFunction == true) {

                DocumentApi.createDocument($scope.database.getName(), $scope.functionToExecute['@rid'], $scope.functionToExecute, function (data) {
                        $scope.getListFunction();
                        $scope.isNewFunction = false;
                        var message = 'Function saved successfully. Server returns ' + JSON.stringify(data);
                        Notification.push({content: message });
                    }
                );

            }
            else {
                DocumentApi.updateDocument($scope.database.getName(), $scope.functionToExecute['@rid'], $scope.functionToExecute, function (data) {
                    $scope.getListFunction();
                    var message = 'Function saved successfully. Server returns ' + JSON.stringify(data);
                    Notification.push({content: message });
                });
            }
        }
        else {
            Utilities.confirm($scope, $modal, $q, {
                title: 'Warning!',
                body: 'Name and Language can not be empty',
                success: function () {

                }

            });
        }

    }

    $scope.deleteFunction = function () {

        var recordID = $scope.functionToExecute['@rid'];
        var clazz = $scope.functionToExecute['@class'];

        Utilities.confirm($scope, $modal, $q, {
            title: 'Warning!',
            body: 'You are removing ' + $scope.functionToExecute['name'] + '. Are you sure?',
            success: function () {
                DocumentApi.deleteDocument($scope.database.getName(), recordID, function (data) {

                    $scope.getListFunction();
                });
            }

        });

    }
}])
;

