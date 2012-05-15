// Copyright 2012 Software Freedom Conservancy. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Script injected into each page when its DOM has fully loaded.
 */

goog.provide('safaridriver.inject');

goog.require('bot.ErrorCode');
goog.require('bot.locators.xpath');
goog.require('bot.response');
goog.require('goog.debug.Logger');
goog.require('safaridriver.Command');
goog.require('safaridriver.message');
goog.require('safaridriver.message.MessageTarget');
goog.require('safaridriver.console');
goog.require('safaridriver.inject.commands');
goog.require('safaridriver.inject.message');
goog.require('safaridriver.inject.page');
goog.require('safaridriver.inject.state');
goog.require('webdriver.Command');
goog.require('webdriver.CommandName');
goog.require('webdriver.promise');


/**
 * @type {!goog.debug.Logger}
 * @const
 */
safaridriver.inject.LOG = goog.debug.Logger.getLogger(
    'safaridriver.inject');


/**
 * @enum {string}
 * @private
 */
safaridriver.inject.MessageType_ = {
  ACTIVATE_FRAME: 'activate-frame'
};


/**
 * @type {!Object.<!webdriver.promise.Deferred>}
 * @private
 */
safaridriver.inject.pendingCommands_ = {};


/**
 * A promise that is resolved once the SafariDriver page script has been
 * loaded by the current page.
 * @type {webdriver.promise.Deferred}
 * @private
 */
safaridriver.inject.installedPageScript_ = null;


/** Initializes this injected script. */
safaridriver.inject.init = function() {
  safaridriver.console.init();
  safaridriver.inject.LOG.info(
      'Loaded injected script for: ' + window.location.href +
      ' (is ' + (safaridriver.inject.state.isActive() ? '' : 'not ') +
      'active)');

  new safaridriver.message.MessageTarget(safari.self).
      on(safaridriver.message.Type.COMMAND, safaridriver.inject.onCommand_).
      on(safaridriver.message.Type.DEACTIVATE, safaridriver.inject.onDeactive_);

  new safaridriver.message.MessageTarget(window).
      on(safaridriver.message.Type.ACTIVATE, safaridriver.inject.onActivate_).
      on(safaridriver.inject.MessageType_.ACTIVATE_FRAME,
         safaridriver.inject.onActivateFrame_).
      on(safaridriver.message.Type.CONNECT, safaridriver.inject.onConnect_).
      on(safaridriver.message.Type.ENCODE, safaridriver.inject.onEncode_).
      on(safaridriver.message.Type.LOAD, safaridriver.inject.onLoad_).
      on(safaridriver.message.Type.RESPONSE, safaridriver.inject.onResponse_);

  window.addEventListener('load', function() {
    var message = new safaridriver.message.Message(
        safaridriver.message.Type.LOAD);

    var target = safaridriver.inject.state.IS_TOP
        ? safari.self.tab : window.top;
    message.send(target);
  }, true);

  window.addEventListener('unload', function() {
    if (safaridriver.inject.state.IS_TOP ||
        safaridriver.inject.state.isActive()) {
      var message = new safaridriver.message.Message(
          safaridriver.message.Type.UNLOAD);
      // If we send this message asynchronously, which is the norm, then the
      // page will complete its unload before the message is sent. Use sendSync
      // to ensure the extension gets our message.
      message.sendSync(safari.self.tab);
    }
  }, true);
};


/**
 * Installs a script in the web page that facilitates communication between this
 * sandboxed environment and the web page.
 * @return {!webdriver.promise.Promise} A promise that will be resolved when the
 *     page has been fully initialized.
 * @private
 */
safaridriver.inject.installPageScript_ = function() {
  if (!safaridriver.inject.installedPageScript_) {
    safaridriver.inject.LOG.info('Installing page script');
    safaridriver.inject.installedPageScript_ =
        new webdriver.promise.Deferred();
    safaridriver.inject.page.init();
  }
  return safaridriver.inject.installedPageScript_.promise;
};


/**
 * Responds to an activate message sent from another frame in this window.
 * @param {!safaridriver.message.Message} message The activate message.
 * @param {!MessageEvent} e The original message event.
 * @private
 */
safaridriver.inject.onActivate_ = function(message, e) {
  // Only respond to messages that came from another injected script in a frame
  // belonging to this window.
  if (!message.isSameOrigin() ||
      !safaridriver.inject.message.isFromFrame(e)) {
    return;
  }

  safaridriver.inject.LOG.info(
      'Activating frame for future command handling.');
  safaridriver.inject.state.setActive(true);

  // Notify the extension that a new frame has been activated.
  message.send(safari.self.tab);

  if (!safaridriver.inject.state.IS_TOP) {
    message = new safaridriver.message.Message(
        safaridriver.inject.MessageType_.ACTIVATE_FRAME);
    message.sendSync(window.top);
  }
};


/**
 * @param {!safaridriver.message.Message} message The activate message.
 * @param {!MessageEvent} e The original message event.
 * @private
 */
safaridriver.inject.onActivateFrame_ = function(message, e) {
  if (safaridriver.inject.state.IS_TOP &&
      safaridriver.inject.message.isFromFrame(e)) {
    safaridriver.inject.LOG.info('Sub-frame has been activated');
    safaridriver.inject.state.setActiveFrame(e.source);
  }
};


/**
 * Forwards connection requests from the content page to the extension.
 * @param {!safaridriver.message.Message} message The connect message.
 * @param {!MessageEvent} e The original message event.
 * @private
 */
safaridriver.inject.onConnect_ = function(message, e) {
  if (message.isSameOrigin() ||
      !safaridriver.inject.message.isFromFrame(e)) {
    return;
  }
  safaridriver.inject.LOG.info(
      'Content page has requested a WebDriver client connection to ' +
          message.getUrl());
  message.send(safari.self.tab);
};


/**
 * Responds to load messages.
 * @param {!safaridriver.message.Message} message The message.
 * @param {!MessageEvent} e The original message event.
 * @private
 */
safaridriver.inject.onLoad_ = function(message, e) {
  if (message.isSameOrigin()) {
    if (safaridriver.inject.message.isFromFrame(e) &&
        e.source &&
        e.source === safaridriver.inject.state.getActiveFrame()) {
      safaridriver.inject.LOG.info('Active frame has reloaded');

      // Step 1: Tell the extension that the page has loaded and is ready for
      // commands again. This message is async.
      message = new safaridriver.message.Message(
          safaridriver.message.Type.LOAD);
      message.send(safari.self.tab);

      // Step 2: The frame reloaded and will have forgotten to activate itself.
      // Reactivate it - synchronously.
      message = new safaridriver.message.Message(
          safaridriver.message.Type.ACTIVATE);
      message.sendSync((/** @type {!Window} */e.source));
    }
  } else if (safaridriver.inject.message.isFromSelf(e) &&
      safaridriver.inject.installedPageScript_ &&
      safaridriver.inject.installedPageScript_.isPending()) {
    safaridriver.inject.installedPageScript_.resolve();
  }
};


/**
 * @param {!safaridriver.message.EncodeMessage} message The message.
 * @param {!MessageEvent} e The original message event.
 * @private
 */
safaridriver.inject.onEncode_ = function(message, e) {
  if (!e.source) {
    safaridriver.inject.LOG.severe('Not looking up element: ' +
        message.getXPath() + '; no window to respond to!');
    return;
  }

  var result = bot.inject.executeScript(function() {
    var xpath = message.getXPath();
    return bot.locators.xpath.single(xpath, document);
  }, []);

  var response = new safaridriver.message.ResponseMessage(
      message.getId(), (/** @type {!bot.response.ResponseObject} */result));
  response.send(e.source);
};


/**
 * Responds to deactivation messages from the extension. These messages are
 * broadcast to all frames as a signal that the extension is about to switch
 * focus to another window.
 * @private
 */
safaridriver.inject.onDeactive_ = function() {
  // Since the top-frame always activates itself on load and it will be
  // re-activated when this window is refocused by the extension, we cheat
  // and simply activate it here. This saves the extension from having to
  // send a switchToFrame(null) message the next time it re-selects this
  // window.
  safaridriver.inject.state.setActive(safaridriver.inject.state.IS_TOP);
};


/**
 * Handles response messages from the page.
 * @param {!safaridriver.message.ResponseMessage} message The message.
 * @param {!MessageEvent} e The original message.
 * @private
 */
safaridriver.inject.onResponse_ = function(message, e) {
  if (message.isSameOrigin() || !safaridriver.inject.message.isFromSelf(e)) {
    return;
  }

  var promise = safaridriver.inject.pendingCommands_[message.getId()];
  if (!promise) {
    safaridriver.inject.LOG.warning(
        'Received response to an unknown command: ' + message);
    return;
  }

  delete safaridriver.inject.pendingCommands_[message.getId()];

  var response = message.getResponse();
  try {
    response['value'] = safaridriver.inject.page.decodeValue(response['value']);
    promise.resolve(response);
  } catch (ex) {
    promise.reject(bot.response.createErrorResponse(ex));
  }
};


/**
 * Command message handler.
 * @param {!safaridriver.message.CommandMessage} message The command message.
 * @private
 */
safaridriver.inject.onCommand_ = function(message) {
  var command = message.getCommand();

  if (command.getName() === webdriver.CommandName.GET) {
    // Get commands should *only* be handled by the topmost frame. In fact, it
    // is an implicit frame switch, so do that for the user now.
    safaridriver.inject.state.setActive(safaridriver.inject.state.IS_TOP);
  }

  if (command.getName() === webdriver.CommandName.SWITCH_TO_WINDOW) {
    // The extension handles window switching directly. If it sends the
    // switch to window command to us, it's to query for our window name.
    // Only the top-most frame should handle this.
    if (safaridriver.inject.state.IS_TOP) {
      sendResponse(bot.response.createResponse(window.name));
    }
    return;
  }

  if (!safaridriver.inject.state.isActive()) {
    return;
  }

  if (!command.getId()) {
    safaridriver.inject.LOG.severe(
        'Ignoring unidentified command message: ' + message);
    return;
  }

  safaridriver.inject.LOG.info('Handling command (is top? ' +
      (window.top === window) + '):\n' + message);

  var handler = safaridriver.inject.COMMAND_MAP_[command.getName()];
  if (handler) {
    try {
      // Don't schedule through webdriver.promise.Application; just execute the
      // command immediately. We're assuming the global page is scheduling
      // commands and only dispatching one at a time.
      webdriver.promise.when(
          handler(command, safaridriver.inject.sendCommandToPage),
          sendSuccess, sendError);
    } catch (ex) {
      sendError(ex);
    }
  } else {
    sendError(Error('Unknown command: ' + message));
  }

  function sendError(error) {
    sendResponse(bot.response.createErrorResponse(error));
  }

  function sendSuccess(value) {
    var response = bot.response.createResponse(value);
    sendResponse(response);
  }

  function sendResponse(response) {
    safaridriver.inject.LOG.info('Sending response' +
        '\ncommand:  ' + message +
        '\nresponse: ' + JSON.stringify(response));

    response = new safaridriver.message.ResponseMessage(command.id, response);
    response.send(safari.self.tab);
  }
};


/**
 * Sends a command message to the page.
 * @param {!safaridriver.Command} command The command to send.
 * @return {!webdriver.promise.Promise} A promise that will be resolved when
 *     a response message has been received.
 */
safaridriver.inject.sendCommandToPage = function(command) {
  return safaridriver.inject.installPageScript_().addCallback(function() {
    var parameters = command.getParameters();
    parameters = (/** @type {!Object.<*>} */
        safaridriver.inject.page.encodeValue(parameters));
    command.setParameters(parameters);

    var message = new safaridriver.message.CommandMessage(command);
    safaridriver.inject.LOG.info('Sending message: ' + message);

    var commandResponse = new webdriver.promise.Deferred();
    safaridriver.inject.pendingCommands_[command.getId()] = commandResponse;
    message.send(window);
    return commandResponse.promise;
  });
};


/**
 * Maps command names to the function that handles it.
 * @type {!Object.<(
 *     function(!safaridriver.Command, function(!safaridriver.Command))|
 *     function(!safaridriver.Command)|
 *     function())>}
 * @private
 */
safaridriver.inject.COMMAND_MAP_ = {};
goog.scope(function() {
  var CommandName = webdriver.CommandName;
  var map = safaridriver.inject.COMMAND_MAP_;
  var commands = safaridriver.inject.commands;

  map[CommandName.GET] = commands.loadUrl;
  map[CommandName.REFRESH] = commands.reloadPage;
  map[CommandName.GO_BACK] = commands.unsupportedHistoryNavigation;
  map[CommandName.GO_FORWARD] = commands.unsupportedHistoryNavigation;

  map[CommandName.GET_TITLE] = commands.getTitle;
  map[CommandName.GET_PAGE_SOURCE] = commands.getPageSource;

  map[CommandName.ADD_COOKIE] = commands.addCookie;
  map[CommandName.GET_ALL_COOKIES] = commands.getCookies;
  map[CommandName.DELETE_ALL_COOKIES] = commands.deleteCookies;
  map[CommandName.DELETE_COOKIE] = commands.deleteCookie;

  map[CommandName.FIND_ELEMENT] = commands.findElement;
  map[CommandName.FIND_CHILD_ELEMENT] = commands.findElement;
  map[CommandName.FIND_ELEMENTS] = commands.findElements;
  map[CommandName.FIND_CHILD_ELEMENTS] = commands.findElements;
  map[CommandName.GET_ACTIVE_ELEMENT] = commands.getActiveElement;

  map[CommandName.CLEAR_ELEMENT] = commands.clearElement;
  map[CommandName.CLICK_ELEMENT] = commands.clickElement;
  map[CommandName.SUBMIT_ELEMENT] = commands.submitElement;
  map[CommandName.GET_ELEMENT_ATTRIBUTE] = commands.getElementAttribute;
  map[CommandName.GET_ELEMENT_LOCATION] = commands.getElementLocation;
  map[CommandName.GET_ELEMENT_SIZE] = commands.getElementSize;
  map[CommandName.GET_ELEMENT_TEXT] = commands.getElementText;
  map[CommandName.GET_ELEMENT_TAG_NAME] = commands.getElementTagName;
  map[CommandName.IS_ELEMENT_DISPLAYED] = commands.isElementDisplayed;
  map[CommandName.IS_ELEMENT_ENABLED] = commands.isElementEnabled;
  map[CommandName.IS_ELEMENT_SELECTED] = commands.isElementSelected;
  map[CommandName.ELEMENT_EQUALS] = commands.elementEquals;
  map[CommandName.GET_ELEMENT_VALUE_OF_CSS_PROPERTY] = commands.getCssValue;
  map[CommandName.SEND_KEYS_TO_ELEMENT] = commands.sendKeysToElement;

  map[CommandName.GET_WINDOW_POSITION] = commands.getWindowPosition;
  map[CommandName.GET_WINDOW_SIZE] = commands.getWindowSize;
  map[CommandName.SET_WINDOW_POSITION] = commands.setWindowPosition;
  map[CommandName.SET_WINDOW_SIZE] = commands.setWindowSize;

  map[CommandName.EXECUTE_SCRIPT] = commands.executeScript;
  map[CommandName.EXECUTE_ASYNC_SCRIPT] = commands.executeScript;

  map[CommandName.SWITCH_TO_FRAME] = commands.switchToFrame;
});

