=== Menu Customizer ===
Contributors: celloexpressions
Tags: menus, custom menus, customizer, theme customizer, gsoc
Requires at least: 4.0
Tested up to: 4.0
Stable tag: 0.0.3
Description: 
License: GPLv2

== Description ==
This plugin is a WordPress Google Summer of Code 2014 project. See the <a href="http://celloexpressions.com/blog/gsoc-project-proposal-menu-customizer/">initial proposal</a> and <a href="http://celloexpressions.com/blog/gsoc-menu-customizer-revised-schedulescope/">adjusted scope/schedule</a>.

The Menu Customizer adds custom menu management to the Theme Customizer. It is partially functional and in alpha development until further notice; please don't try to run it on a production site. Certain features currently require core patches, and the plugin requires the latest trunk version of WordPress (4.0). Once the plugin hits version 0.1, it will be at this initial feature-complete stage and ready for full testing. Until then, consider it a preview of things to come, but don't expect things to work :)

= Core Patches =
Several improvements to both Menus and the Theme Customizer are also in the works as a part of this project, in the form of core patches. All of the following tickets have patches, but most need to be reviewed still. If you're interested in any of the following (especially those awaiting review), please test them and leave comments on the ticket! All "REQUIRED" tickets are required for the Menu Customizer plugin to funciton as intended.

Menus
* <a href="https://core.trac.wordpress.org/ticket/23076">#23076</a>: Update menu item title when editing menu item label ''[committed to WordPress 4.0 alpha]''
* <a href="https://core.trac.wordpress.org/ticket/13273">#13273</a>: Core support & UI for Placeholder Menu Items ''[awaiting review, needs feedback]''
* <a href="https://core.trac.wordpress.org/ticket/28138">#28138</a>: Updating menu item requires passing all of a menu item's data to wp_update_nav_menu_item() ''[awaiting review, to  become required]''

Customizer
* <a href="https://core.trac.wordpress.org/ticket/27406">#27506</a>: Introduce Customizer "Pages", Organize all widget area sections into a customizer page ''[AWAITING FEEDBACK/REVIEW, REQUIRED]''
* <a href="https://core.trac.wordpress.org/ticket/27979">#27979</a>: Pass Customizer Setting instance to `customize_update_` and `customize_preview_` actions ''[scheduled for WordPress 4.0, awaiting commit, REQUIRED]''
* <a href="https://core.trac.wordpress.org/ticket/28477">#28477</a>: New Built-in Customizer Control Types ''[awaiting review]''
* <a href="https://core.trac.wordpress.org/ticket/27981">#27981</a>: Support descriptions for Customizer Controls ''[scheduled for WordPress 4.0]''
* <a href="https://core.trac.wordpress.org/ticket/28504">#28504</a>: Icons for Customizer Sections ''[awaiting review]''


== Installation ==
1. Take the easy route and install through the WordPress plugin adder OR
1. Download the .zip file and upload the unzipped folder to the `/wp-content/plugins/` directory
1. Activate the plugin through the 'Plugins' menu in WordPress
1. Visit the Theme Customizer (Appearance -> Customize) to customize your menus with live previews (currently only partially functional).

== Changelog ==
= 0.0.3 =
* Initial commit.

== Upgrade Notice ==
= 0.0.3 =
* Initial commit.