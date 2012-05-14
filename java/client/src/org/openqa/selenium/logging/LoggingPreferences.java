/*
Copyright 2007-2011 Selenium committers

Portions copyright 2011 Software Freedom Conservancy

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

package org.openqa.selenium.logging;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;

/**
 * Represents the logging preferences.
 *
 * Sample usage:
 *  DesiredCapabilities caps = DesiredCapabilities.firefox();
 *  LoggingPreferences logs = new LoggingPreferences();
 *  logs.enable(LogType.DRIVER, Level.INFO);
 *  caps.setCapability(CapabilityType.LOGGING_PREFS, logs);
 *
 *  WebDriver driver = new FirefoxDriver(caps);
 */
public class LoggingPreferences {
  // Mapping the {@link LogType} to {@link Level}
  private final Map<String, Level> prefs = new HashMap<String, Level>();

  /**
   * Enables logging for the given log type at the specified level and above.
   * @param logType String the logType. Can be any of {@link LogType}.
   * @param level {@link Level} the level.
   */
  public void enable(String logType, Level level) {
    prefs.put(logType, level);
  }

  /**
   * @return the set of log types for which logging has been enabled.
   */
  public Set<String> getEnabledLogTypes() {
    return new HashSet<String>(prefs.keySet());
  }

  /**
   * @param logType String the {@link LogType}.
   * @return the {@link Level} for the given {@link LogType} if enabled.
   *     Otherwise returns {@link Level.OFF}.
   */
  public Level getLevel(String logType) {
    return prefs.get(logType) == null ? Level.OFF : prefs.get(logType);
  }
}
