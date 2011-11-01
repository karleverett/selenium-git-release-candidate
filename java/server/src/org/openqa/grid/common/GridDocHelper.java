/*
Copyright 2011 WebDriver committers
Copyright 2011 Software Freedom Conservancy

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

package org.openqa.grid.common;

import org.apache.commons.lang.WordUtils;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

public class GridDocHelper {
  private static Properties gridProperties = load("defaults/GridParameters.properties");

  public static void printHelp(String msg) {
    printHelpInConsole(gridProperties, msg, true);
  }

  public static void printHelp(String msg, boolean error) {
    printHelpInConsole(gridProperties, msg, error);
  }


  public static String getGridParam(String param) {
    return getParam(gridProperties, param);
  }


  private static String getParam(Properties p, String param) {
    if (param == null) {
      return "";
    }
    String s = (String) gridProperties.get(param);
    if (s == null) {
      return "No help specified for " + param;
    } else {
      return s;
    }
  }

  private static void printHelpInConsole(Properties p, String msg, boolean error) {
    if (msg != null) {
      if (error) {
        System.out.println("Error building the config :" + msg);
      } else {
        System.out.println(msg);
      }

    }

    System.out.println("Usage :");
    for (Object key : p.keySet()) {
      System.out.println("-" + key + ":\n\t"
          + WordUtils.wrap(getParam(p, key.toString()), 80, "\n\t", false));
    }
  }

  private static Properties load(String resource) {
    InputStream in = Thread.currentThread().getContextClassLoader().getResourceAsStream(resource);
    Properties p = new Properties();
    if (in != null) {
      try {
        p.load(in);
        return p;
      } catch (IOException e) {
        throw new RuntimeException("bug." + resource + " cannot be loaded.");
      }
    } else {
      throw new RuntimeException("bug." + resource + " cannot be loaded.");
    }
  }


}
