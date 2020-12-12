export default {
    state: {
        activeTool: "move",
    },
    getters: {
        activeTool: state => state.activeTool,
    },
    mutations: {
        setActiveTool( state, tool ) {
            state.activeTool = tool;
        },
    },
};
