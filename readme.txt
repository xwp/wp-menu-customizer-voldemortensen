=== Menu Customizer ===
Contributors: celloexpressions
Tags: menus, custom menus, customizer, theme customizer, gsoc
Requires at least: 4.0-beta1
Tested up to: 4.0
Stable tag: 0.0.6
Description: Manage and live-preview your Custom Menus with the Customizer. GSoC Project in ALPHA development.
License: GPLv2

== Description ==
This plugin is a WordPress Google Summer of Code 2014 project. See the <a href="http://make.wordpress.org/core/tag/menu-customizer/">updates on Make WordPress Core</a> for more information.

The Menu Customizer adds custom menu management to the Customizer. It is not fully functional and in alpha development until further notice; please don't try to run it on a production site. The plugin requires WordPress 4.0 beta 1 or higher, as it utilizes new functionalities added in 4.0. Once the plugin hits version 0.1, it will be at the initial feature-complete stage and ready for full testing. Until then, consider it a preview of things to come, but don't expect things to be at 100% :)

Menu Customizer currently requires PHP 5.3 or higher.

= Core Patches =
Several improvements to the Customizer are also in the works as a part of this project, in the form of core patches (for example, the Panels API). See <a href="http://make.wordpress.org/core/2014/07/08/customizer-improvements-in-4-0/">Customizer Improvements in 4.0</a>, and an upcomming Customizer Roadmap for details.

== Installation ==
1. Take the easy route and install through the WordPress plugin adder OR
1. Download the .zip file and upload the unzipped folder to the `/wp-content/plugins/` directory
1. Activate the plugin through the 'Plugins' menu in WordPress
1. Visit the Customizer (Appearance -> Customize) to customize your menus with live previews.

== Changelog ==
= 0.0.6 =
* Implement live-previewing of menus and menu items.
* Use core templating functions in JS.
* Visual improvements to the add-menu-items panel, with scrolling contained within available-item-type sections. More to come here on the code side.

= 0.0.5 =
* Add/delete Menus
* Menu item & menu data is now saved in a scalable way.

= 0.0.4 =
* Add-menu-items
* Use panels

= 0.0.3 =
* Initial commit.

== Upgrade Notice ==
= 0.0.5 =
* Add/delete Menus; Menu item & menu data is now saved in a scalable way.

= 0.0.4 =
* Add-menu-items, use core panels implementation

= 0.0.3 =
* Initial commit.