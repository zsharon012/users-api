const supabase = require("../config/supabase");

// Create instance before exporting
const userController = new (class UserController {
  async getProfile(req, res) {
    try {
      const userId = req.user.id;
      console.log("Fetching profile for user:", userId);

      const { data, error } = await supabase
        .from("users")
        .select(
          `
          id,
          firstname,
          lastname,
          email,
          bio,
          major,
          graduationyear,
          profilepicture,
          user_posts (
            id,
            title,
            content,
            created_at
          ),
          user_courses (
            courses (
              id,
              name,
              department,
              professor
            )
          )
        `
        )
        .eq("auth_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Supabase error:", error);
        throw error;
      }

      if (data) {
        return res.json(data);
      }

      const { data: newProfile, error: createError } = await supabase
        .from("users")
        .insert({
          firstname: "New",
          lastname: "User",
          email: req.user.email,
          major: "Undeclared",
          graduationyear: 2025,
          auth_id: userId,
        })
        .select()
        .single();

      if (createError) {
        console.error("Create error:", createError);
        throw createError;
      }

      res.json(newProfile);
    } catch (error) {
      console.error("Error in getProfile:", error);
      res.status(400).json({ error: error.message });
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      console.log("Updating profile for user:", userId);

      // First, try to find the existing user
      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", userId)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking user:", checkError);
        throw checkError;
      }

      console.log("Existing user data:", existingUser);

      const {
        firstName,
        lastName,
        bio,
        major,
        graduationYear,
        profilePicture,
      } = req.body;

      // If user doesn't exist, create new profile
      if (!existingUser) {
        console.log("User not found, creating new profile");
        const { data: newUser, error: createError } = await supabase
          .from("users")
          .insert({
            firstname: firstName,
            lastname: lastName,
            bio: bio || null,
            major: major || "Undeclared",
            graduationyear: graduationYear || null,
            profilepicture: profilePicture || null,
            auth_id: userId,
            email: req.user.email,
          })
          .select("*");

        if (createError) {
          console.error("Create error:", createError);
          throw createError;
        }

        return res.json(newUser[0]);
      }

      // If user exists, update the profile
      console.log("User found, updating profile with ID:", existingUser.id);

      const updateData = {
        firstname: firstName || existingUser.firstname,
        lastname: lastName || existingUser.lastname,
        bio: bio !== undefined ? bio : existingUser.bio,
        major: major || existingUser.major,
        graduationyear: graduationYear || existingUser.graduationyear,
        profilepicture: profilePicture || existingUser.profilepicture,
      };

      console.log("Update data:", updateData);

      // First, try the update
      const { data: updatedUsers, error: updateError } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", existingUser.id)
        .select("*");

      if (updateError) {
        console.error("Update error:", updateError);
        throw updateError;
      }

      if (!updatedUsers || updatedUsers.length === 0) {
        console.error("No user was updated");
        throw new Error("Failed to update user");
      }

      console.log("Updated user data:", updatedUsers[0]);
      res.json(updatedUsers[0]);
    } catch (error) {
      console.error("Error in updateProfile:", error);
      res.status(400).json({ error: error.message });
    }
  }

  async getUsersByMajor(req, res) {
    try {
      const { major } = req.params;

      const { data, error } = await supabase
        .from("users")
        .select(
          `
          *,
          user_posts: user_posts(count),
          user_courses: user_courses(count)
        `
        )
        .eq("major", major);

      if (error) throw error;

      const transformedData = data.map((user) => ({
        ...user,
        post_count: user.user_posts[0]?.count || 0,
        course_count: user.user_courses[0]?.count || 0,
        user_posts: undefined,
        user_courses: undefined,
      }));

      res.json(transformedData);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async enrollInCourse(req, res) {
    try {
      3;
      const { user } = req;
      const { courseId } = req.params;

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (userError) throw userError;

      const { data, error } = await supabase
        .from("user_courses")
        .insert({
          user_id: userData.id,
          course_id: courseId,
        })
        .select(
          `
          courses (
            id,
            name,
            department,
            professor
          )
        /*  */`
        )
        .single();

      if (error) throw error;

      res.json(data);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async createPost(req, res) {
    try {
      const { user } = req;
      const { title, content } = req.body;

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (userError) throw userError;

      const { data, error } = await supabase
        .from("user_posts")
        .insert({
          user_id: userData.id,
          title,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      res.json(data);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
})();

// Add debug logging
console.log("Available controller methods:", Object.keys(userController));

// Export the controller instance
module.exports = userController;