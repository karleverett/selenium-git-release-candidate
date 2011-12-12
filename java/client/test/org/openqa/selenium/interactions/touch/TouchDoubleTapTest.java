/*
Copyright 2007-2011 WebDriver committers
Copyright 2007-2011 Google Inc.

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

package org.openqa.selenium.interactions.touch;

import static org.openqa.selenium.testing.Ignore.Driver.CHROME;
import static org.openqa.selenium.testing.Ignore.Driver.FIREFOX;
import static org.openqa.selenium.testing.Ignore.Driver.HTMLUNIT;
import static org.openqa.selenium.testing.Ignore.Driver.IE;
import static org.openqa.selenium.testing.Ignore.Driver.IPHONE;
import static org.openqa.selenium.testing.Ignore.Driver.OPERA;
import static org.openqa.selenium.testing.Ignore.Driver.SELENESE;

import org.openqa.selenium.AbstractDriverTestCase;
import org.openqa.selenium.By;
import org.openqa.selenium.testing.Ignore;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.interactions.Action;

/**
 * Tests the basic double tap operations.
 */
public class TouchDoubleTapTest extends AbstractDriverTestCase {

  private TouchActions getBuilder(WebDriver driver) {
    return new TouchActions(driver);
  }

  private void doubleTapOnElement(String elementId) {
    WebElement toDoubleTap = driver.findElement(By.id(elementId));
    Action doubleTap = getBuilder(driver).doubleTap(toDoubleTap).build();
    doubleTap.perform();
  }

  @Ignore(value = {CHROME, FIREFOX, HTMLUNIT, IE, IPHONE, OPERA, SELENESE},
      reason = "TouchScreen operations not supported")
  public void testCanDoubleTapOnAnImageAndAlterLocationOfElementsInScreen() {
    driver.get(pages.touchLongContentPage);

    WebElement image = driver.findElement(By.id("imagestart"));
    int y = image.getLocation().y;
    // The element is located at a certain point, after double tapping,
    // the y coordinate must change.
    assertTrue(y > 100);

    doubleTapOnElement("imagestart");

    y = image.getLocation().y;
    assertTrue(y < 50);
  }

}
