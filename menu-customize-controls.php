<?php
/**
 * Customizer Controls for the Menu Customizer.
 */

/**
 * Menu Customize Control Class
 */
class WP_Menu_Customize_Control extends WP_Customize_Control {
	public $type = 'menu';
	public $menu_id;

	/**
	 * Refresh the parameters passed to the JavaScript via JSON.
	 *
	 * @since Menu Customizer 0.0
	 */
	public function to_json() {
		parent::to_json();
		$exported_properties = array( 'menu_id' );
		foreach ( $exported_properties as $key ) {
			$this->json[ $key ] = $this->$key;
		}
	}

	/**
	 * Render the control's content.
	 *
	 * @since Menu Customizer 0.0
	 */
	public function render_content() {
		$id = absint( $this->menu_id );
		
		?>

		<span class="button-secondary add-new-menu-item" tabindex="0">
			<?php _e( 'Add Links' ); ?>
		</span>

		<span class="reorder-toggle" tabindex="0">
			<span class="reorder"><?php _ex( 'Reorder', 'Reorder menu items in Customizer' ); ?></span>
			<span class="reorder-done"><?php _ex( 'Done', 'Cancel reordering menu items in Customizer'  ); ?></span>
		</span>
		<ul class="menu-settings">
			<?php // We may need to bring this back, depending on the outcome of user testing. Hide it for now in favor of the locations section. (The idea is that having all menus visible/editable at once makes the locations selectors more intuitive and the checkboxes confusing)
				if ( current_theme_supports( 'menus' ) && ! current_theme_supports( 'menus' ) ) : ?>

				<li class="customize-control">
					<span class="customize-control-title"><?php _e( 'Theme locations' ); ?></span>
				</li>
				<?php $locations = get_registered_nav_menus();
				$menu_locations = get_nav_menu_locations(); ?>
				<?php foreach ( $locations as $location => $description ) : ?>

					<li class="customize-control customize-control-checkbox">
						<input type="checkbox"<?php checked( isset( $menu_locations[ $location ] ) && $menu_locations[ $location ] == $id ); ?> name="menu-locations-<?php echo $id; ?>[<?php echo esc_attr( $location ); ?>]" id="menu-locations-<?php echo $id; ?>-<?php echo esc_attr( $location ); ?>" value="<?php echo esc_attr( $id ); ?>" /> <label for="menu-locations-<?php echo $id; ?>-<?php echo esc_attr( $location ); ?>"><?php echo $description; ?></label>
						<?php if ( ! empty( $menu_locations[ $location ] ) && $menu_locations[ $location ] != $id ) : ?>
							<span class="theme-location-set"> <?php printf( __( "(Currently set to: %s)" ), wp_get_nav_menu_object( $menu_locations[ $location ] )->name ); ?> </span>
						<?php endif; ?>
					</li>

				<?php endforeach; ?>

			<?php endif; ?>
		</ul>
<?php
	}
}

/**
 * Menu Item Customize Control Class
 */
class WP_Menu_Item_Customize_Control extends WP_Customize_Control {
	public $type = 'menu_item';
	public $menu_id = 0;
	public $item;
	public $menu_item_id = 0;
	public $depth = 0;
	public $position = 0;

	/**
	 * Constructor.
	 *
	 * @uses WP_Customize_Control::__construct()
	 *
	 * @param WP_Customize_Manager $manager
	 * @param string $id
	 * @param array $args
	 */
	public function __construct( $manager, $id, $args = array() ) {
		parent::__construct( $manager, $id, $args );

		$this->menu_item_id = $this->item->ID;
		$this->position = $this->item->menu_order;
		$this->depth = $this->depth( $this->item->menu_item_parent, 0 );
	}

	/**
	 * Refresh the parameters passed to the JavaScript via JSON.
	 *
	 * @since Menu Customizer 0.0
	 */
	public function to_json() {
		parent::to_json();
		$exported_properties = array( 'menu_item_id', 'menu_id', 'depth', 'position' );
		foreach ( $exported_properties as $key ) {
			$this->json[ $key ] = $this->$key;
		}
	}

	/**
	 * Determine the depth of a menu item by recursion.
	 *
	 * @param int $parent_id The id of the parent menu item
	 * @param int $depth Inverse current item depth
	 *
	 * @returns int Depth of the original menu item.
	 */
	public function depth( $parent_id, $depth = 0 ) {
		if ( 0 == $parent_id ) {
			// This is a top-level item, so the current depth is the maximum.
			return $depth;
		} else {
			// Increase depth.
			$depth = $depth + 1;

			// Find menu item parent's parent menu item id (the grandparent id).
			$parent = get_post( $parent_id ); // WP_Post object.
			$parent = wp_setup_nav_menu_item( $parent ); // Adds menu item properties.
			$parent_parent_id = $parent->menu_item_parent;

			return $this->depth( $parent_parent_id, $depth );
		}
	}

	/**
	 * Renders the control wrapper and calls $this->render_content() for the internals.
	 *
	 * @since Menu Customizer 0.0
	 */
	protected function render() {
		$id    = 'customize-control-' . str_replace( '[', '-', str_replace( ']', '', $this->id ) );
		$class = 'customize-control customize-control-' . $this->type . ' nav-menu-item-wrap';

		?><li id="<?php echo esc_attr( $id ); ?>" class="<?php echo esc_attr( $class ); ?>">
			<?php $this->render_content(); ?>
		</li><?php
	}

	/**
	 * Render the control's content.
	 *
	 * @since Menu Customizer 0.0
	 */
	public function render_content() {
		$item = $this->item;
		$item_id = $item->ID;
		$setting_id = 'nav_menus[' . $this->menu_id . '][' . $item_id .']';
		$depth = $this->depth( $item->menu_item_parent, 0 );

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

				<input class="menu-item-data-menu-id" type="hidden" name="menu-item-menu-id" value="<?php echo $this->menu_id; ?>" />
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
}

/**
 * Outputs the screen options controls from nav-menus.php.
 */
class WP_Menu_Options_Customize_Control extends WP_Customize_Control {
	public $type = 'menu_options';

	public function render_content() {
		// Essentially adds the screen options.
		add_filter( 'manage_nav-menus_columns', array( $this, 'wp_nav_menu_manage_columns' ) );
		
		// Display screen options.
		$screen = WP_Screen::get( 'nav-menus.php' );
		$screen->render_screen_options();
	}

	/**
	 * Copied from wp-admin/includes/nav-menu.php. Returns the advanced options for the nav menus page.
	 *
	 * Link title attribute added as it's a relatively advanced concept for new users.
	 *
	 * @since 0.0
	 *
	 * @return Array The advanced menu properties.
	 */
	function wp_nav_menu_manage_columns() {
		return array(
			'_title' => __('Show advanced menu properties'),
			'cb' => '<input type="checkbox" />',
			'link-target' => __('Link Target'),
			'attr-title' => __('Title Attribute'),
			'css-classes' => __('CSS Classes'),
			'xfn' => __('Link Relationship (XFN)'),
			'description' => __('Description'),
		);
	}
}

