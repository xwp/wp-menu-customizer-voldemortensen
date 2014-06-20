<?php
/**
 * Plugin Name: Menu Customizer
 * Plugin URI: http://wordpress.org/plugins/menu-customizer
 * Description: Manage your Custom Menus with the Theme Customizer. GSoC Project in ALPHA development.
 * Version: 0.0.3
 * Author: Nick Halsey
 * Author URI: http://celloexpressions.com/
 * Tags: menus, custom menus, customizer, theme customizer, gsoc
 * License: GPL

=====================================================================================
Copyright (C) 2014 Nick Halsey

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with WordPress; if not, write to the Free Software
Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
=====================================================================================
*/

if ( is_admin() && defined( 'DOING_AJAX' ) && DOING_AJAX ) {
	require_once( plugin_dir_path( __FILE__ ) . '/menu-customize-ajax.php' );
}

/**
 * Enqueue sripts and styles.
 *
 * @since Menu Customizer 0.0
 */
function menu_customizer_enqueue() {
	wp_enqueue_style( 'menu-customizer', plugin_dir_url( __FILE__ ) . 'menu-customizer.css' );
	wp_enqueue_script( 'menu-customizer-options', plugin_dir_url( __FILE__ ) . 'menu-customizer-options.js', array( 'jquery' ) );
	wp_enqueue_script( 'menu-customizer', plugin_dir_url( __FILE__ ) . 'menu-customizer.js', array( 'jquery', 'wp-backbone', 'customize-controls' ) );

	$menuitem_reorder_nav_tpl = sprintf(
		'<div class="menu-item-reorder-nav"><span class="menus-move-up" tabindex="0">%1$s</span><span class="menus-move-down" tabindex="0">%2$s</span><span class="menus-move-left" tabindex="0">%3$s</span><span class="menus-move-right" tabindex="0">%4$s</span></div>',
		__( 'Move up' ),
		__( 'Move down' ),
		__( 'Move one level up' ),
		__( 'Move one level down' )
	);

	$available_item_tpl = '
		<div id="menu-item-tpl-{{ data.id }}" class="menu-item-tpl" data-menu-item-id="{{ data.id }}">
			<dl class="menu-item-bar">
				<dt class="menu-item-handle">
					<span class="item-type">{{ data.type_label }}</span>
					<span class="item-title">{{ data.name }}</span>
					<a class="item-add" href="#">Add Menu Item</a>
				</dt>
			</dl>
		</div>';

	$loading_item_tpl = '
		<li class="nav-menu-inserted-item-loading added-menu-item added-dbid-{{ data.id }} customize-control customize-control-menu_item nav-menu-item-wrap">
			<div class="menu-item menu-item-depth-0 menu-item-edit-inactive">
				<dl class="menu-item-bar">
					<dt class="menu-item-handle">
						<span class="spinner" style="display: block;"></span>
						<span class="item-type">{{ data.type_label }}</span>
						<span class="item-title menu-item-title">{{ data.name }}</span>
					</dt>
				</dl>
			</div>
		</li>';

	global $wp_scripts;

	// Pass data to JS.
	$settings = array(
		'nonce'              => wp_create_nonce( 'customize-menus' ),
		'allMenus'           => wp_get_nav_menus(),
		'availableMenuItems' => menu_customizer_available_items(),
		'itemTypes'          => menu_customizer_available_item_types(),
		'l10n'               => array(
			'untitled'     => _x( '(no label)', 'Missing menu item navigation label.' ),
			'custom_label' => _x( 'Custom', 'Custom menu item type label.' ),
		),
		'tpl'                => array(
			'menuitemReorderNav'  => $menuitem_reorder_nav_tpl,
			'availableMenuItem'   => $available_item_tpl,
			'loadingItemTemplate' => $loading_item_tpl,
		),
	);

	$data = sprintf( 'var _wpCustomizeMenusSettings = %s;', json_encode( $settings ) );
	$wp_scripts->add_data( 'menu-customizer', 'data', $data );
}
add_action( 'customize_controls_enqueue_scripts', 'menu_customizer_enqueue' );

/**
 * Add the customizer settings and controls.
 *
 * @since Menu Customizer 0.0
 *
 * @param WP_Customize_Manager $wp_customize Theme Customizer object.
 */
function menu_customizer_customize_register( $wp_customize ) {
	require_once( plugin_dir_path( __FILE__ ) . '/menu-customize-controls.php' );

	// Create a super-section/page for Menus.
	// @see https://core.trac.wordpress.org/ticket/27406
	// @requires https://core.trac.wordpress.org/attachment/ticket/27406/27406.2.diff
	if ( method_exists( 'WP_Customize_Manager', 'add_page' ) ) {
		$wp_customize->add_page( 'menus', array( 
			'title' => __( 'Menus' ),
			'description' => __( '<p>This screen is used for managing your custom navigation menus.</p><p>Menus can be displayed in locations defined by your theme, even used in sidebars by adding a “Custom Menu” widget on the Widgets screen.</p>' ),
		) );
	}

	// Rebrand the existing "Navigation" section to the global theme locations section.
	$locations      = get_registered_nav_menus();
	$num_locations  = count( array_keys( $locations ) );
	$description = sprintf( _n( 'Your theme contains %s menu location. Select which menu you would like to use.', 'Your theme contains %s menu locations. Select which menu appears in each location.', $num_locations ), number_format_i18n( $num_locations ) );
	$description .= '<br>' . __( 'You can also place menus in widget areas with the Custom Menu widget.' );
	$wp_customize->get_section( 'nav' )->title = __( 'Theme Locations' );
	$wp_customize->get_section( 'nav' )->description = $description;
	$wp_customize->get_section( 'nav' )->page = 'menus';

	// Add the screen options control to the existing "Navigation" section (it gets moved around in the JS).
	$wp_customize->add_setting( 'menu_customizer_options', array(
		'type' => 'menu_options',
	) );
	$wp_customize->add_control( new WP_Menu_Options_Customize_Control( $wp_customize, 'menu_customizer_options', array(
		'section'  => 'nav',
		'priority' => 20,
	) ) );

	// Register each custom menu as a Customizer section, and add each menu item to each menu.
	$menus = wp_get_nav_menus();

	foreach ( $menus as $menu ) {
		$menu_id = $menu->term_id;

		// Create a section for each menu.
		$section_id = 'nav_menus[' . $menu_id . ']';
		$wp_customize->add_section( $section_id , array(
			'title'    => $menu->name,
			'priority' => 101, // Right after existing core "nav" section.
			'page'     => 'menus',
		) );

		// Add a setting & control for the menu name.
		$menu_name_setting_id = $section_id . '[name]';
		$wp_customize->add_setting( $menu_name_setting_id, array(
			'default'           => $menu->name,
			'type'              => 'menu_name',
		) );

		$wp_customize->add_control( $menu_name_setting_id, array(
			'label'    => '',
			'section'  => $section_id,
			'type'     => 'text',
			'priority' => 0,
		) );

		// Add the menu contents.
		$menu_items = wp_get_nav_menu_items( $menu_id );
		$item_ids = array();
		foreach( $menu_items as $i => $item ) {
			$item_ids[] = $item->ID;

			// Setup default item data.
			$data = array(
				'menu_item_id'     => $item->ID,
				'menu_id'          => $menu_id,
				'title'            => $item->title,
				'target'           => $item->target,
				'attr_title'       => $item->attr_title,
				'classes'          => $item->classes,
				'xfn'              => $item->xfn,
				'description'      => $item->description,
				'object_id'        => $item->object_id,
				'object'           => $item->object,
				'menu_item_parent' => $item->menu_item_parent,
				'menu_order'       => $item->menu_order,
				'type'             => $item->type,
			);

			// Create a setting for each menu item.
			$menu_item_setting_id = $section_id . '[' . $item->ID . ']';
			$wp_customize->add_setting( $menu_item_setting_id, array(
				'type' => 'option',
				'default' => $data,
			) );

			// Create a control for each menu item.
			$wp_customize->add_control( new WP_Menu_Item_Customize_Control( $wp_customize, $menu_item_setting_id, array( 
				'label'       => $item->title,
				'section'     => $section_id,
				'priority'    => 10 + $i,
				'menu_id'     => $menu_id,
				'item'        => $item,
				'type'        => 'menu_item',
			) ) );
		}

		// Add the menu-wide controls (add, re-order, etc.).
		$menu_controls_setting_id = $section_id . '[controls]';
		$wp_customize->add_setting( $menu_controls_setting_id, array(
			'type'    => 'menu_controls',
			'default' => $item_ids,
		) );
		$wp_customize->add_control( new WP_Menu_Customize_Control( $wp_customize, $menu_controls_setting_id, array(
			'section'  => $section_id,
			'menu_id'  => $menu_id,
			'priority' => 998,
		) ) );

		// Add the auto-add new pages option.
		$auto_add = get_option( 'nav_menu_options' );
		if ( ! isset( $auto_add['auto_add'] ) ) {
			$auto_add = false;
		}
		elseif ( false !== array_search( $menu_id, $auto_add['auto_add'] ) ) {
			$auto_add = true;
		}
		else {
			$auto_add = false;
		}

		$menu_autoadd_setting_id = $section_id . '[auto_add]';
		$wp_customize->add_setting( $menu_autoadd_setting_id, array(
			'type'    => 'menu_autoadd',
			'default' => $auto_add,
		) );
		$wp_customize->add_control( $menu_autoadd_setting_id, array(
			'label'    => __( 'Automatically add new top-level pages to this menu.' ),
			'section'  => $section_id,
			'type'     => 'checkbox',
			'priority' => 999,
		) );
	}
}
add_action( 'customize_register', 'menu_customizer_customize_register', 11 ); // Needs to run after core Navigation section is setup.

/**
 * Save the Menu Name when it's changed.
 *
 * Menu Name is not previewable because it's designed primarily for admin uses.
 *
 * Uses `customize_update_$setting->type` hook with 2nd parameter.
 * @see https://core.trac.wordpress.org/ticket/27979
 * @requires https://core.trac.wordpress.org/attachment/ticket/27979/27979.2.patch
 *
 * @since Menu Customizer 0.0
 *
 * @param mixed $value Value of the setting.
 * @param WP_Customize_Setting $setting WP_Customize_Setting instance.
 */
function menu_customizer_update_menu_name( $value, $setting ) {
	if ( ! $value || ! $setting ) {
		return;
	}

	// Get the menu id from the setting id.
	$id = str_replace( 'nav_menus[', '', $setting->id );
	$id = str_replace( '][name]', '', $id );

	if ( 0 == $id ) {
		return; // Avoid creating a new, empty menu.
	}

	// Update the menu name with the new $value.
	wp_update_nav_menu_object( $id, array( 'menu-name' => trim( esc_html( $value ) ) ) );
}
add_action( 'customize_update_menu_name', 'menu_customizer_update_menu_name', 10, 2 );

/**
 * Update the `auto_add` nav menus option.
 *
 * Auto-add is not previewable because it is administration-specific.
 *
 * Uses `customize_update_$setting->type` hook with 2nd parameter.
 * @see https://core.trac.wordpress.org/ticket/27979
 * @requires https://core.trac.wordpress.org/attachment/ticket/27979/27979.2.patch
 *
 * @since Menu Customizer 0.0
 *
 * @param mixed $value Value of the setting.
 * @param WP_Customize_Setting $setting WP_Customize_Setting instance.
 */
function menu_customizer_update_menu_autoadd( $value, $setting ) {
	if ( ! $setting ) {
		return;
	}

	// Get the menu id from the setting id.
	$id = str_replace( 'nav_menus[', '', $setting->id );
	$id = absint( str_replace( '][auto_add]', '', $id ) );

	if ( ! $id ) {
		return;
	}

	$nav_menu_option = (array) get_option( 'nav_menu_options' );	
	if ( ! isset( $nav_menu_option['auto_add'] ) ) {
		$nav_menu_option['auto_add'] = array();
	}
	if ( $value ) {
		if ( ! in_array( $id, $nav_menu_option['auto_add'] ) )
			$nav_menu_option['auto_add'][] = $id;
	} else {
		if ( false !== ( $key = array_search( $id, $nav_menu_option['auto_add'] ) ) )
			unset( $nav_menu_option['auto_add'][$key] );
	}
	// Remove nonexistent/deleted menus
	$nav_menu_option['auto_add'] = array_intersect( $nav_menu_option['auto_add'], wp_get_nav_menus( array( 'fields' => 'ids' ) ) );
	update_option( 'nav_menu_options', $nav_menu_option );	
}
add_action( 'customize_update_menu_autoadd', 'menu_customizer_update_menu_autoadd', 10, 2 );

/**
 * Return all potential menu items.
 * @todo: doing this like this is probably a horrible idea. Some sort of batching is probably needed.
 *
 * @since Menu Customizer 0.0
 *
 * @return array All potential menu items' names, object ids, and types.
 */
function menu_customizer_available_items() {
	$items = array();

	$post_types = get_post_types( array( 'show_in_nav_menus' => true ), 'object' );

	if ( ! $post_types ) {
		return;
	}

	foreach ( $post_types as $post_type ) {
		if ( $post_type ) {
			$args = array(
				'posts_per_page'   => -1,
				'orderby'          => 'post_date',
				'order'            => 'DESC',
				'post_type'        => $post_type->name,
			);
			$allposts = get_posts( $args );
			foreach ( $allposts as $post ) {
				$items[] = array(
					'id'         => 'post-' . $post->ID,
					'name'       => $post->post_title,
					'type'       => $post_type->name,
					'type_label' => $post_type->labels->singular_name,
					'obj_type'   => 'post_type',
					'order'      => strtotime( $post->post_modified ), // Posts are orderd by time updated.
				);
			}
		}
	}

	$taxonomies = get_taxonomies( array( 'show_in_nav_menus' => true ), 'object' );

	if ( $taxonomies ) {
		foreach ( $taxonomies as $tax ) {
			if ( $tax ) {
				$name = $tax->name;
				$args = array(
					'child_of' => 0,
					'exclude' => '',
					'hide_empty' => false,
					'hierarchical' => 1,
					'include' => '',
					'number' => 0,
					'offset' => 0,
					'order' => 'ASC',
					'orderby' => 'name',
					'pad_counts' => false,
				);
				$terms = get_terms( $name, $args );

				foreach ( $terms as $term ) {
					$items[] = array(
						'id'         => 'term-' . $term->term_id,
						'name'       => $term->name,
						'type'       => $name,
						'type_label' => $tax->labels->singular_name,
						'obj_type'   => 'taxonomy',
						'order'       => $term->count, // Terms are ordered by count; will always be after all posts when combined.
					);
				}
			}
		}
	}

	// Add "Home" link. Treat as a page, but switch to custom on add.
	$home = array(
		'id'         => 0,
		'name'       => _x( 'Home', 'nav menu home label' ),
		'type'       => 'page',
		'type_label' => __( 'Page' ),
		'obj_type'   => 'custom',
		'order'      => time(), // Will be the first item.
	);
	$items[] = $home;

	return $items;
}

function menu_customizer_available_item_types() {
	$types = get_post_types( array( 'show_in_nav_menus' => true ), 'names' );
	$taxes = get_taxonomies( array( 'show_in_nav_menus' => true ), 'names' );
	return array_merge( $types, $taxes );
}

function menu_customizer_available_items_template() {
?>
	<div id="available-menu-items" class="accordion-container">
		<div id="new-custom-menu-item" class="accordion-section">
			<h4 class="accordion-section-title"><?php _e( 'Links' ); ?></h4>
			<div class="accordion-section-content">
				<input type="hidden" value="custom" id="custom-menu-item-type" name="menu-item[-1][menu-item-type]" />
				<p id="menu-item-url-wrap">
					<label class="howto" for="custom-menu-item-url">
						<span>URL</span>
						<input id="custom-menu-item-url" name="menu-item[-1][menu-item-url]" type="text" class="code menu-item-textbox" value="http://">
					</label>
				</p>
				<p id="menu-item-name-wrap">
					<label class="howto" for="custom-menu-item-name">
						<span>Link Text</span>
						<input id="custom-menu-item-name" name="menu-item[-1][menu-item-title]" type="text" class="regular-text menu-item-textbox">
					</label>
				</p>
				<p class="button-controls">
					<span class="add-to-menu">
						<input type="submit" class="button-secondary submit-add-to-menu right" value="Add to Menu" name="add-custom-menu-item" id="custom-menu-item-submit">
						<span class="spinner"></span>
					</span>
				</p>
			</div>
		</div>
		<div id="available-menu-items-search" class="accordion-section">
			<div class="accordion-section-title">
				<label class="screen-reader-text" for="menu-items-search"><?php _e( 'Search Menu Items' ); ?></label>
				<input type="search" id="menu-items-search" placeholder="<?php esc_attr_e( 'Search menu items&hellip;' ) ?>" />
			</div>
			<div class="accordion-section-content">
			</div>
		</div>
		<?php

		// @todo: use add_meta_box/do_accordion_section and make screen-optional?
		// Containers for per-post-type item browsing; items added with JS.
		$post_types = get_post_types( array( 'show_in_nav_menus' => true ), 'object' );
		if ( $post_types ) {
			foreach ( $post_types as $type ) {
				?>
				<div id="available-menu-items-<?php echo $type->name; ?>" class="accordion-section">
					<h4 class="accordion-section-title"><?php echo $type->label; ?></h4>
					<div class="accordion-section-content">
					</div>
				</div>
				<?php
			}
		}

		$taxonomies = get_taxonomies( array( 'show_in_nav_menus' => true ), 'object' );
		if ( $taxonomies ) {
			foreach ( $taxonomies as $tax ) {
				?>
				<div id="available-menu-items-<?php echo $tax->name; ?>" class="accordion-section">
					<h4 class="accordion-section-title"><?php echo $tax->label; ?></h4>
					<div class="accordion-section-content">
					</div>
				</div>
				<?php
			}
		}
		?>
	</div><!-- #available-menu-items -->
<?php
}
add_action( 'customize_controls_print_footer_scripts','menu_customizer_available_items_template' );

/**
 * Render a single menu item control.
 *
 * @param Object $item The nav menu item to render.
 * @param int $menu_id The item's menu id.
 * @param int $depth The depth of the menu item.
 */
function menu_customizer_render_item_control( $item, $menu_id, $depth ) {
	$item_id = $item->ID;
	$setting_id = 'nav_menus[' . $menu_id . '][' . $item_id .']';

	$original_title = '';
	if ( 'taxonomy' == $item->type ) {
		$original_title = get_term_field( 'name', $item->object_id, $item->object, 'raw' );
		if ( is_wp_error( $original_title ) ) {
			$original_title = false;
		}
	} elseif ( 'post_type' == $item->type ) {
		$original_object = get_post( $item->object_id );
		$original_title = get_the_title( $original_object->ID );
	}

	$classes = array(
		'menu-item menu-item-depth-' . $depth,
		'menu-item-' . esc_attr( $item->object ),
		'menu-item-edit-inactive',
	);

	$title = $item->title;
	if ( ! empty( $item->_invalid ) ) {
		$classes[] = 'menu-item-invalid';
		/* translators: %s: title of menu item which is invalid */
		$title = sprintf( __( '%s (Invalid)' ), $item->title );
	} elseif ( isset( $item->post_status ) && 'draft' == $item->post_status ) {
		$classes[] = 'pending';
		/* translators: %s: title of menu item in draft status */
		$title = sprintf( __('%s (Pending)'), $item->title );
	}
	$title = ( ! isset( $item->label ) || '' == $item->label ) ? $title : $item->label;

	$submenu_text_style = '';
	if ( 0 == $depth ) {
		$submenu_text_style = 'style="display: none;"';
	}

	?>
	<div id="menu-item-<?php echo $item_id; ?>" class="<?php echo implode(' ', $classes ); ?>">
		<dl class="menu-item-bar">
			<dt class="menu-item-handle">
				<span class="item-type"><?php echo esc_html( $item->type_label ); ?></span>
				<span class="item-title"><span class="menu-item-title"><?php echo esc_html( $title ); ?></span><span class="is-submenu" <?php echo $submenu_text_style; ?>><?php _e( 'sub item' ); ?></span></span>
				<span class="item-controls">
					<a class="item-edit" id="edit-<?php echo $item_id; ?>" title="<?php esc_attr_e('Edit Menu Item'); ?>" href="#"><?php _e( 'Edit Menu Item' ); ?></a>
				</span>
			</dt>
		</dl>

		<div class="menu-item-settings" id="menu-item-settings-<?php echo $item_id; ?>">
			<?php if( 'custom' == $item->type ) : ?>
				<p class="field-url description description-thin">
					<label for="edit-menu-item-url-<?php echo $item_id; ?>">
						<?php _e( 'URL' ); ?><br />
						<input class="widefat code edit-menu-item-url" type="text" value="<?php echo esc_attr( $item->url ); ?>" id="edit-menu-item-url-<?php echo $item_id; ?>" name="<?php echo $setting_id; ?>[url]"  />
					</label>
				</p>
			<?php endif; ?>
			<p class="description description-thin">
				<label for="edit-menu-item-title-<?php echo $item_id; ?>">
					<?php _e( 'Navigation Label' ); ?><br />
					<input type="text" id="edit-menu-item-title-<?php echo $item_id; ?>" class="widefat edit-menu-item-title" name="<?php echo $setting_id; ?>[title]" value="<?php echo esc_attr( $item->title ); ?>" />
				</label>
			</p>
			<p class="field-link-target description description-thin">
				<label for="edit-menu-item-target-<?php echo $item_id; ?>">
					<input type="checkbox" id="edit-menu-item-target-<?php echo $item_id; ?>" value="_blank" name="menu-item-target"<?php checked( $item->target, '_blank' ); ?> />
					<?php _e( 'Open link in a new tab' ); ?>
				</label>
			</p>
			<p class="field-attr-title description description-thin">
				<label for="edit-menu-item-attr-title-<?php echo $item_id; ?>">
					<?php _e( 'Title Attribute' ); ?><br />
					<input type="text" id="edit-menu-item-attr-title-<?php echo $item_id; ?>" class="widefat edit-menu-item-attr-title" name="menu-item-attr-title" value="<?php echo esc_attr( $item->attr_title ); ?>" />
				</label>
			</p>
			<p class="field-css-classes description description-thin">
				<label for="edit-menu-item-classes-<?php echo $item_id; ?>">
					<?php _e( 'CSS Classes' ); ?><br />
					<input type="text" id="edit-menu-item-classes-<?php echo $item_id; ?>" class="widefat code edit-menu-item-classes" name="menu-item-classes" value="<?php echo esc_attr( implode(' ', $item->classes ) ); ?>" />
				</label>
			</p>
			<p class="field-xfn description description-thin">
				<label for="edit-menu-item-xfn-<?php echo $item_id; ?>">
					<?php _e( 'Link Relationship (XFN)' ); ?><br />
					<input type="text" id="edit-menu-item-xfn-<?php echo $item_id; ?>" class="widefat code edit-menu-item-xfn" name="menu-item-xfn" value="<?php echo esc_attr( $item->xfn ); ?>" />
				</label>
			</p>
			<p class="field-description description description-thin">
				<label for="edit-menu-item-description-<?php echo $item_id; ?>">
					<?php _e( 'Description' ); ?><br />
					<textarea id="edit-menu-item-description-<?php echo $item_id; ?>" class="widefat edit-menu-item-description" rows="3" cols="20" name="menu-item-description"><?php echo esc_html( $item->description ); // textarea_escaped ?></textarea>
					<span class="description"><?php _e('The description will be displayed in the menu if the current theme supports it.'); ?></span>
				</label>
			</p>

			<div class="menu-item-actions description-thin submitbox">
				<?php if( 'custom' != $item->type && $original_title !== false ) : ?>
					<p class="link-to-original">
						<?php printf( __('Original: %s'), '<a href="' . esc_attr( $item->url ) . '" target="_blank">' . esc_html( $original_title ) . '</a>' ); ?>
					</p>
				<?php endif; ?>
				<a class="item-delete submitdelete deletion" id="delete-menu-item-<?php echo $item_id; ?>" href="#"><?php _e( 'Remove' ); ?></a>
			</div>

			<input class="menu-item-data-menu-id" type="hidden" name="menu-item-menu-id" value="<?php echo $menu_id; ?>" />
			<input class="menu-item-data-db-id" type="hidden" name="menu-item-db-id" value="<?php echo $item_id; ?>" />
			<input class="menu-item-data-object-id" type="hidden" name="menu-item-object-id" value="<?php echo esc_attr( $item->object_id ); ?>" />
			<input class="menu-item-data-object" type="hidden" name="menu-item-object" value="<?php echo esc_attr( $item->object ); ?>" />
			<input class="menu-item-data-parent-id" type="hidden" name="menu-item-parent-id" value="<?php echo esc_attr( $item->menu_item_parent ); ?>" />
			<input class="menu-item-data-position" type="hidden" name="menu-item-position" value="<?php echo esc_attr( $item->menu_order ); ?>" />
			<input class="menu-item-data-type" type="hidden" name="menu-item-type" value="<?php echo esc_attr( $item->type ); ?>" />
		</div><!-- .menu-item-settings-->
		<ul class="menu-item-transport"></ul>
	</div>
	<?php
}
