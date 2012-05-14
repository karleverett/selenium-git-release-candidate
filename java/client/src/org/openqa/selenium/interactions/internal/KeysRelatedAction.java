/*
Copyright 2007-2010 WebDriver committers

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 */

package org.openqa.selenium.interactions.internal;

import org.openqa.selenium.Keyboard;
import org.openqa.selenium.Mouse;
import org.openqa.selenium.internal.Locatable;

/**
 * Represents a general action related to keyboard input.
 */
public abstract class KeysRelatedAction extends BaseAction {
  protected final Keyboard keyboard;
  protected final Mouse mouse;

  protected KeysRelatedAction(Keyboard keyboard, Mouse mouse, Locatable locationProvider) {
    super(locationProvider);
    this.keyboard = keyboard;
    this.mouse = mouse;
  }

  protected void focusOnElement() {
    if (where != null) {
      mouse.click(where.getCoordinates());
    }
  }
}
