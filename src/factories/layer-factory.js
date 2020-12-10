/**
 * Creates a new layer within a Document
 */
export default {
    create( name = 'New Layer', graphics = [] ) {
        return {
            name,
            graphics,
            visible: true
        }
    },
};
