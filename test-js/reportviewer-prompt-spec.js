/*!
 * This program is free software; you can redistribute it and/or modify it under the
 * terms of the GNU Lesser General Public License, version 2.1 as published by the Free Software
 * Foundation.
 *
 * You should have received a copy of the GNU Lesser General Public License along with this
 * program; if not, you can obtain a copy at http://www.gnu.org/licenses/old-licenses/lgpl-2.1.html
 * or from the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Lesser General Public License for more details.
 *
 * Copyright (c) 2002-2016 Pentaho Corporation..  All rights reserved.
 */

define(["reportviewer/reportviewer-prompt", "reportviewer/reportviewer-logging", "common-ui/jquery-clean",
      "text!./parameterDefinition.xml!strip", "./utils/registryMock", "common-ui/prompting/api/PromptingAPI",
      "dojo/dom-class", 'common-ui/util/util'],
    function (Prompt, Logging, $, parameterDefinition, registryMock, PromptingAPI, domClass, util) {

      describe("Report Viewer Prompt", function () {
        var reportPrompt;
        var testGuid = -1;

        beforeAll(function() {
          window.inSchedulerDialog = false;
          var mockGlassPane = jasmine.createSpyObj("glassPane", ["show", "hide"]);
          mockGlassPane.id = "glassPane";
          registryMock.mock(mockGlassPane);
        });

        afterAll(function() {
          registryMock.unMock("glassPane");
        });

        beforeEach(function () {
          window._isTopReportViewer = true;
          var options = {parent: window.parent.logger};
          window.logged = Logging.create(window.name, options);

          reportPrompt = new Prompt();
          spyOn(reportPrompt, 'initPromptPanel').and.callFake(function () {});

          spyOn($, "ajax").and.callFake(function (params) {
            params.success(parameterDefinition);
          });
        });

        var createPromptExpectactions = function createPromptExpectactions(done, options) {
          // hijacking this function to check the post create expectations
          reportPrompt._hideLoadingIndicator = function() {
            expect(reportPrompt.panel).not.toBe(undefined);
            expect(reportPrompt.parseParameterDefinition).toHaveBeenCalled();
            expect(reportPrompt.parseParameterDefinition).toHaveBeenCalledWith(parameterDefinition);
            expect(reportPrompt.initPromptPanel).toHaveBeenCalled();
            expect($.ajax).toHaveBeenCalled();
            expect($.ajax.calls.count()).toEqual(options.ajaxCalls);
            expect(reportPrompt.mode).toEqual(options.mode);
            done();
          };

          expect(reportPrompt.panel).toBe(undefined);
          expect(reportPrompt.mode).toEqual("INITIAL");

          reportPrompt.createPromptPanel();
        };

        it("Properly creates a prompt panel", function(done) {
          spyOn(reportPrompt, "parseParameterDefinition").and.callThrough();
          createPromptExpectactions(done, {ajaxCalls: 1, mode: "INITIAL"});
        });

        it("Properly creates a prompt panel with allowAutoSubmit = true", function(done) {
          var realParseParameterDefinition = reportPrompt.parseParameterDefinition.bind(reportPrompt);
          spyOn(reportPrompt, "parseParameterDefinition").and.callFake(function(xmlString) {
            var paramDefn = realParseParameterDefinition(xmlString);
            paramDefn.allowAutoSubmit = function() {return true};
            return paramDefn;
          });
          createPromptExpectactions(done, {ajaxCalls: 2, mode: "MANUAL"});
        });

        describe("_buildReportContentOptions", function() {
          var parameterValues = {'::session': '::sessionVALUE', 'action': 'testAction'};
          beforeEach(function() {
            spyOn(util, "getUrlParameters").and.returnValue({});
            spyOn(reportPrompt.api.operation, "getParameterValues").and.returnValue(parameterValues);

            window.inMobile = true;
            spyOn(reportPrompt, 'showGlassPane').and.callFake(function () {});
            spyOn(reportPrompt, 'hideGlassPane').and.callFake(function () {});

            spyOn(domClass, 'add').and.callFake(function() {});
            spyOn(domClass, 'remove').and.callFake(function() {});

            reportPrompt.createPromptPanel();
          });

          it("should verify the parameter values are being retrieved from the API", function() {
            var renderMode = "renderMode";
            var result = reportPrompt._buildReportContentOptions(renderMode, true);
            expect(util.getUrlParameters).toHaveBeenCalled();
            expect(reportPrompt.api.operation.getParameterValues).toHaveBeenCalled();

            expect(result['::session']).not.toBeDefined();
            expect(result['renderMode']).toBe(renderMode);

          });

          it("should verify the parameter values are being retrieved from the API", function() {
            reportPrompt.panel = null;
            var renderMode = "renderMode";
            var result = reportPrompt._buildReportContentOptions(renderMode, true);
            expect(util.getUrlParameters).toHaveBeenCalled();
            expect(reportPrompt.api.operation.getParameterValues).not.toHaveBeenCalled();

            expect(result['::session']).not.toBeDefined();
            expect(result['renderMode']).toBe(renderMode);
            expect(result['name']).not.toBeDefined();
          });

          it("should not call _getStateProperty when promptMode is INITIAL", function() {
            spyOn(reportPrompt, '_getStateProperty').and.callThrough();

            reportPrompt._getParameterDefinitionRenderMode("INITIAL");
            expect(reportPrompt._getStateProperty).not.toHaveBeenCalled();
          });

          it("should call _getStateProperty when promptMode is USERINPUT", function() {
            spyOn(reportPrompt, '_getStateProperty').and.callFake(function () {});
            reportPrompt.panel = {};

            reportPrompt._getParameterDefinitionRenderMode("USERINPUT");
            expect(reportPrompt._getStateProperty).toHaveBeenCalledWith('autoSubmit');
          });
        });
      });
    });
